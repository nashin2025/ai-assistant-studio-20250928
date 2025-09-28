import { storage } from "../storage";
import type { InsertProjectTemplate } from "@shared/schema";

export class TemplateService {
  
  async initializeDefaultTemplates(): Promise<void> {
    const existingTemplates = await storage.getProjectTemplates();
    
    // Only initialize if no templates exist
    if (existingTemplates.length > 0) {
      return;
    }

    const defaultTemplates = this.getDefaultTemplates();
    
    for (const template of defaultTemplates) {
      try {
        await storage.createProjectTemplate(template);
        console.log(`Initialized template: ${template.name}`);
      } catch (error) {
        console.error(`Failed to initialize template ${template.name}:`, error);
      }
    }
  }

  private getDefaultTemplates(): InsertProjectTemplate[] {
    return [
      {
        name: "React TypeScript App",
        description: "Modern React application with TypeScript, Vite, and Tailwind CSS",
        category: "web",
        techStack: {
          frontend: ["React", "TypeScript", "Vite", "Tailwind CSS"],
          backend: [],
          database: [],
          tools: ["ESLint", "Prettier"]
        },
        files: [
          {
            path: "package.json",
            content: JSON.stringify({
              name: "react-typescript-app",
              version: "1.0.0",
              type: "module",
              scripts: {
                dev: "vite",
                build: "tsc && vite build",
                preview: "vite preview",
                lint: "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
              },
              dependencies: {
                react: "^18.2.0",
                "react-dom": "^18.2.0"
              },
              devDependencies: {
                "@types/react": "^18.2.43",
                "@types/react-dom": "^18.2.17",
                "@typescript-eslint/eslint-plugin": "^6.14.0",
                "@typescript-eslint/parser": "^6.14.0",
                "@vitejs/plugin-react": "^4.2.1",
                autoprefixer: "^10.4.16",
                eslint: "^8.55.0",
                "eslint-plugin-react-hooks": "^4.6.0",
                "eslint-plugin-react-refresh": "^0.4.5",
                postcss: "^8.4.32",
                tailwindcss: "^3.4.0",
                typescript: "^5.2.2",
                vite: "^5.0.8"
              }
            }, null, 2),
            type: "config"
          },
          {
            path: "src/App.tsx",
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
            React TypeScript App
          </div>
          <h1 className="mt-2 text-xl leading-tight font-medium text-black">
            Welcome to your new project!
          </h1>
          <p className="mt-2 text-gray-500">
            This is a modern React application built with TypeScript and Tailwind CSS.
            Start building amazing things!
          </p>
          <div className="mt-4">
            <button className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;`,
            type: "component"
          },
          {
            path: "src/main.tsx",
            content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
            type: "entry"
          },
          {
            path: "src/index.css",
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
            type: "styles"
          },
          {
            path: "index.html",
            content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React TypeScript App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
            type: "markup"
          }
        ],
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0"
        },
        instructions: "1. Run 'npm install' to install dependencies\n2. Run 'npm run dev' to start development server\n3. Open http://localhost:5173 in your browser\n4. Start editing src/App.tsx to build your application",
        difficulty: "beginner",
        estimatedTime: "30 minutes",
        tags: ["react", "typescript", "vite", "tailwind", "frontend"],
        isPublic: true
      },
      {
        name: "Express API Server",
        description: "RESTful API server with Express.js, TypeScript, and PostgreSQL",
        category: "api",
        techStack: {
          frontend: [],
          backend: ["Node.js", "Express", "TypeScript"],
          database: ["PostgreSQL"],
          tools: ["Nodemon", "ESLint"]
        },
        files: [
          {
            path: "package.json",
            content: JSON.stringify({
              name: "express-api-server",
              version: "1.0.0",
              main: "dist/index.js",
              scripts: {
                build: "tsc",
                start: "node dist/index.js",
                dev: "nodemon src/index.ts",
                test: "jest"
              },
              dependencies: {
                express: "^4.18.2",
                cors: "^2.8.5",
                helmet: "^7.1.0",
                dotenv: "^16.3.1",
                pg: "^8.11.3"
              },
              devDependencies: {
                "@types/express": "^4.17.21",
                "@types/cors": "^2.8.17",
                "@types/node": "^20.10.5",
                "@types/pg": "^8.10.9",
                typescript: "^5.3.3",
                nodemon: "^3.0.2",
                "ts-node": "^10.9.2",
                jest: "^29.7.0",
                "@types/jest": "^29.5.8"
              }
            }, null, 2),
            type: "config"
          },
          {
            path: "src/index.ts",
            content: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { apiRoutes } from './routes/api';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Express API Server is running!' });
});

app.use('/api', apiRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});

export default app;`,
            type: "entry"
          },
          {
            path: "src/routes/api.ts",
            content: `import { Router } from 'express';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Example users endpoint
router.get('/users', (req, res) => {
  // TODO: Implement user retrieval from database
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

router.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  // TODO: Save user to database
  const newUser = { id: Date.now(), name, email };
  res.status(201).json(newUser);
});

export { router as apiRoutes };`,
            type: "routes"
          },
          {
            path: "src/middleware/errorHandler.ts",
            content: `import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);
  
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};`,
            type: "middleware"
          }
        ],
        dependencies: {
          express: "^4.18.2",
          cors: "^2.8.5",
          helmet: "^7.1.0",
          dotenv: "^16.3.1"
        },
        instructions: "1. Run 'npm install' to install dependencies\n2. Create a .env file with DATABASE_URL\n3. Run 'npm run dev' to start development server\n4. Test the API at http://localhost:3000/api/health\n5. Add your database models and expand the API endpoints",
        difficulty: "intermediate",
        estimatedTime: "1-2 hours",
        tags: ["express", "typescript", "api", "backend", "postgresql"],
        isPublic: true
      },
      {
        name: "Next.js Full Stack",
        description: "Full-stack Next.js application with TypeScript, Tailwind, and authentication",
        category: "web",
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Next.js API Routes"],
          database: ["PostgreSQL"],
          tools: ["Prisma", "NextAuth.js"]
        },
        files: [
          {
            path: "package.json",
            content: JSON.stringify({
              name: "nextjs-fullstack-app",
              version: "0.1.0",
              private: true,
              scripts: {
                build: "next build",
                dev: "next dev",
                lint: "next lint",
                start: "next start"
              },
              dependencies: {
                "next": "14.0.4",
                "react": "^18",
                "react-dom": "^18",
                "next-auth": "^4.24.5",
                "@prisma/client": "^5.7.1"
              },
              devDependencies: {
                "typescript": "^5",
                "@types/node": "^20",
                "@types/react": "^18",
                "@types/react-dom": "^18",
                "autoprefixer": "^10.0.1",
                "eslint": "^8",
                "eslint-config-next": "14.0.4",
                "postcss": "^8",
                "prisma": "^5.7.1",
                "tailwindcss": "^3.3.0"
              }
            }, null, 2),
            type: "config"
          },
          {
            path: "app/page.tsx",
            content: `export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            Welcome to Your
            <span className="text-indigo-600"> Next.js App</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            A full-stack Next.js application with TypeScript, Tailwind CSS, and authentication.
            Ready to build something amazing!
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="#"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Get started
            </a>
            <a href="#" className="text-sm font-semibold leading-6 text-gray-900">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}`,
            type: "page"
          },
          {
            path: "app/layout.tsx",
            content: `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Next.js Full Stack App',
  description: 'A modern full-stack application built with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`,
            type: "layout"
          },
          {
            path: "app/globals.css",
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
            type: "styles"
          }
        ],
        dependencies: {
          "next": "14.0.4",
          "react": "^18",
          "react-dom": "^18"
        },
        instructions: "1. Run 'npm install' to install dependencies\n2. Set up your database connection in .env.local\n3. Run 'npx prisma generate' to set up Prisma\n4. Run 'npm run dev' to start development server\n5. Open http://localhost:3000 to see your app",
        difficulty: "intermediate",
        estimatedTime: "2-3 hours",
        tags: ["nextjs", "react", "typescript", "tailwind", "fullstack"],
        isPublic: true
      },
      {
        name: "Python FastAPI Backend",
        description: "Modern Python API with FastAPI, async/await, and PostgreSQL integration",
        category: "api",
        techStack: {
          frontend: [],
          backend: ["Python", "FastAPI", "SQLAlchemy"],
          database: ["PostgreSQL"],
          tools: ["Uvicorn", "Pydantic"]
        },
        files: [
          {
            path: "requirements.txt",
            content: `fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.2
python-dotenv==1.0.0
alembic==1.13.1
python-multipart==0.0.6`,
            type: "config"
          },
          {
            path: "main.py",
            content: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from routers import users
from database import engine, Base
import os
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="FastAPI Backend",
    description="A modern Python API built with FastAPI",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "FastAPI Backend is running!"}

@app.get("/health")
async def health_check():
    return {"status": "OK", "message": "API is healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )`,
            type: "entry"
          },
          {
            path: "database.py",
            content: `from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()`,
            type: "database"
          },
          {
            path: "models/user.py",
            content: `from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())`,
            type: "model"
          },
          {
            path: "schemas/user.py",
            content: `from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True`,
            type: "schema"
          },
          {
            path: "routers/users.py",
            content: `from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.user import User
from schemas.user import User as UserSchema, UserCreate, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserSchema])
async def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserSchema)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=UserSchema)
async def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}`,
            type: "routes"
          }
        ],
        dependencies: {
          fastapi: "0.104.1",
          uvicorn: "0.24.0",
          sqlalchemy: "2.0.23"
        },
        instructions: "1. Create a virtual environment: python -m venv venv\n2. Activate it: source venv/bin/activate (Unix) or venv\\Scripts\\activate (Windows)\n3. Install dependencies: pip install -r requirements.txt\n4. Create .env file with DATABASE_URL\n5. Run the server: python main.py\n6. Visit http://localhost:8000/docs for interactive API documentation",
        difficulty: "intermediate",
        estimatedTime: "2-3 hours",
        tags: ["python", "fastapi", "api", "backend", "sqlalchemy"],
        isPublic: true
      }
    ];
  }

  async seedTemplate(templateData: InsertProjectTemplate): Promise<void> {
    try {
      await storage.createProjectTemplate(templateData);
      console.log(`Seeded template: ${templateData.name}`);
    } catch (error) {
      console.error(`Failed to seed template ${templateData.name}:`, error);
    }
  }
}