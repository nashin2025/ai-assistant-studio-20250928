// Local Authentication system for AI Assistant Studio
// Replaces Replit Auth for local hosting

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Allow HTTP in development
      sameSite: 'lax', // CSRF protection
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  // For local development, create a default admin user if none exists
  await createDefaultUserIfNeeded();

  app.set("trust proxy", 1);

  // Rate limiting for login endpoint
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many login attempts from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Rate limiting for registration endpoint
  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 registrations per hour
    message: {
      error: 'Too many registration attempts from this IP, please try again after 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for username/password authentication
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email: string, password: string, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      cb(null, user);
    } catch (error) {
      cb(error);
    }
  });

  // Auth routes
  app.post("/api/login", loginLimiter, (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || 'Invalid credentials' });
      }
      
      // Regenerate session to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error("Error regenerating session:", err);
          return res.status(500).json({ error: 'Login failed' });
        }
        
        // Log the user in with the new session
        req.login(user, (err) => {
          if (err) {
            console.error("Error during login:", err);
            return res.status(500).json({ error: 'Login failed' });
          }
          
          res.json({ 
            success: true, 
            user: {
              id: user?.id,
              email: user?.email,
              firstName: user?.firstName,
              lastName: user?.lastName
            }
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/register", registerLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.upsertUser({
        id: crypto.randomUUID(),
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        passwordHash
      });

      res.json({ 
        success: true,
        message: 'User created successfully' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      // Destroy session to prevent reuse
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        
        // Clear session cookie
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
      });
    });
  });
}

async function createDefaultUserIfNeeded() {
  try {
    // Only create default admin in development mode unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DEFAULT_ADMIN) {
      return;
    }
    
    // Check if any users exist
    const existingUsers = await storage.getAllUsers();
    if (existingUsers.length === 0) {
      console.log('Creating default admin user...');
      
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
      
      // In production, require a strong password
      if (process.env.NODE_ENV === 'production' && defaultPassword === 'admin123') {
        console.error('ERROR: DEFAULT_ADMIN_PASSWORD must be set to a strong password in production!');
        return;
      }
      
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      
      await storage.upsertUser({
        id: crypto.randomUUID(),
        email: 'admin@localhost',
        firstName: 'Admin',
        lastName: 'User',
        passwordHash
      });
      
      console.log('Default admin user created:');
      console.log('Email: admin@localhost');
      console.log(`Password: ${defaultPassword}`);
      console.log('Please change this password after first login!');
    }
  } catch (error) {
    console.error('Failed to create default user:', error);
  }
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};