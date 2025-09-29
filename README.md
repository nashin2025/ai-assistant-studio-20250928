# AI Assistant Studio - Local Hosting Edition

> 🤖 A comprehensive AI development companion that runs entirely on your local machine, supporting local LLMs, web search, GitHub integration, and project management - with complete privacy and control.

## ✨ Features

### 🧠 Local LLM Integration
- **Multiple LLM Support** - Compatible with Ollama, LMStudio, OpenAI API, and any OpenAI-compatible endpoints
- **Local Model Privacy** - All conversations stay on your machine
- **Custom Configurations** - Multiple LLM endpoints with different models and settings
- **Streaming Responses** - Real-time AI responses with proper streaming

### 💬 Intelligent Chat Interface
- **Multi-modal Support** - Text and file attachments in conversations
- **Context Awareness** - Maintains conversation history and context
- **File Analysis** - Upload and analyze code, documents, and other files
- **Export Options** - Save conversations in multiple formats

### 🔍 Web Search Integration
- **Multiple Search Engines** - Google, Bing, and DuckDuckGo support
- **API Key Optional** - DuckDuckGo works without any API keys
- **Search Result Analysis** - AI-powered analysis of search results
- **Source Attribution** - Proper linking to original sources

### 📁 Project Management
- **GitHub Integration** - Connect your repositories for code analysis
- **Project Templates** - Pre-built templates for different project types
- **Version Control** - Track project plans and changes over time
- **Progress Tracking** - Monitor development milestones

### 🛡️ Privacy & Security
- **Fully Local** - No external dependencies except optional search APIs
- **Data Ownership** - All your data stays on your machine
- **Secure Authentication** - GitHub OAuth with secure session management
- **PostgreSQL Storage** - Robust, scalable database with auto-setup capabilities

### 🎨 Modern Interface
- **Professional IDE-like Layout** - Three-panel design with sidebar navigation and file tree
- **Dark/Light Theme** - Responsive design with theme switching
- **Real-time Updates** - Live chat interface with hot module replacement
- **Mobile Friendly** - Works on desktop, tablet, and mobile devices
- **File Drag & Drop** - Easy file upload with drag-and-drop support
- **Hierarchical File Tree** - Professional file organization with expand/collapse functionality

### 🔧 Professional Development Tools
- **Code Analysis** - Comprehensive code review with GitHub integration and metrics
- **Document Analysis** - AI-powered document processing with insights generation
- **File Manager** - Advanced file organization with nested folder support
- **Project Templates** - Quick project creation with multiple technology stacks
- **One-Click Startup** - Platform-specific startup scripts (start.bat for Windows, start.sh for Unix)

## 🚀 Quick Start

### Prerequisites

Before installing, ensure you have the following:

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **Git** - For version control and GitHub integration

> 🎉 **Database Auto-Setup!** PostgreSQL database is automatically configured on Replit with zero manual setup.

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/nashin2025/ai-assistant-studio-20250928.git
cd ai-assistant-studio-20250928
copy package.windows.json package.json
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Session Security (Required)
SESSION_SECRET=your-super-secure-random-session-secret-at-least-32-characters

# Authentication (Optional - for default admin user)
DEFAULT_ADMIN_PASSWORD=your-admin-password

# GitHub Integration (Optional)
GITHUB_PERSONAL_ACCESS_TOKEN=your-github-personal-access-token

# Search Engine APIs (Optional)
GOOGLE_API_KEY=your-google-api-key
GOOGLE_CX=your-google-search-engine-id
BING_API_KEY=your-bing-api-key
# Note: DuckDuckGo search works without an API key
```
### 3.1 session_secret Gen

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 4. Start the Application

**Option 1: Using npm (all platforms):**
```bash
npm run dev
```

**Option 2: Using platform-specific scripts:**

**Windows:**
```cmd
start.bat
```

**Linux/macOS:**
```bash
./start.sh
```

The application will be available at `http://localhost:5000`

**Database Setup:** PostgreSQL database is automatically configured on Replit (or via DATABASE_URL environment variable)

## 🖥️ Platform-Specific Setup

### Windows Setup

#### Installing Prerequisites

**Node.js:**
1. Download from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Verify installation: `node --version` and `npm --version`

**Git:**
1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Install with default settings
3. Verify installation: `git --version`

#### PowerShell Setup Commands

```powershell
# Clone repository
git clone https://github.com/nashin2025/ai-assistant-studio-20250928.git
cd ai-assistant-studio-20250928

# Install dependencies
npm install

# Start the application (PostgreSQL auto-configured)
npm run dev
```

### macOS Setup

#### Installing Prerequisites with Homebrew

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install prerequisites
brew install node git
```

#### Setup Commands

```bash
# Clone repository
git clone https://github.com/nashin2025/ai-assistant-studio-20250928.git
cd ai-assistant-studio-20250928

# Install dependencies
npm install

# Start the application (PostgreSQL auto-configured)
npm run dev
```

### Linux Setup (Ubuntu/Debian)

#### Installing Prerequisites

```bash
# Update package list
sudo apt update

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git
```

#### Application Setup

```bash
# Clone repository
git clone https://github.com/nashin2025/ai-assistant-studio-20250928.git
cd ai-assistant-studio-20250928

# Install dependencies
npm install

# Start the application (PostgreSQL auto-configured)
npm run dev
```

### Linux Setup (CentOS/RHEL/Fedora)

#### Installing Prerequisites

```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs  # or 'yum' for CentOS 7

# Install Git
sudo dnf install git  # or 'yum'
```

Follow the same application setup steps as Ubuntu/Debian.

## 🧠 Local LLM Setup

### Ollama Integration

**Install Ollama:**

**Windows/macOS:**
1. Download from [ollama.ai](https://ollama.ai/)
2. Install and start the application

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Download Models:**
```bash
# Popular models
ollama pull llama2
ollama pull codellama
ollama pull mistral
```

**Configuration in AI Assistant Studio:**
- **Name:** Ollama Local
- **Endpoint:** `http://localhost:11434`
- **Model:** `llama2` (or your preferred model)
- **Temperature:** 0.7

### LMStudio Integration

**Install LMStudio:**
1. Download from [lmstudio.ai](https://lmstudio.ai/)
2. Install and download your preferred models
3. Start the local server (usually on port 1234)

**Configuration in AI Assistant Studio:**
- **Name:** LMStudio Local
- **Endpoint:** `http://localhost:1234/v1`
- **Model:** Your loaded model name
- **Temperature:** 0.7

### OpenAI API Integration

**Configuration:**
- **Name:** OpenAI GPT
- **Endpoint:** `https://api.openai.com/v1`
- **Model:** `gpt-3.5-turbo` or `gpt-4`
- **API Key:** Your OpenAI API key
- **Temperature:** 0.7

## 🔧 Configuration

### First-Time Setup

1. **Access the Application:** Navigate to `http://localhost:5000`

2. **Default Login:** 
   - Email: `admin@localhost`
   - Password: `admin123` (or your `DEFAULT_ADMIN_PASSWORD`)

3. **Configure LLM:**
   - Go to Settings → LLM Configuration
   - Add your local LLM endpoint (Ollama/LMStudio)
   - Test the connection
   - Set as default

4. **Optional Configurations:**
   - GitHub: Add your Personal Access Token for repository integration
   - Search: Add API keys for Google/Bing (DuckDuckGo works without keys)

### Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SESSION_SECRET` | ✅ | Secret for session encryption | `your-super-secure-random-string` |
| `DEFAULT_ADMIN_PASSWORD` | ⚠️ | Default admin password | `your-secure-password` |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | ❌ | GitHub integration | `ghp_your_token_here` |
| `GOOGLE_API_KEY` | ❌ | Google Search API | `AIza...` |
| `GOOGLE_CX` | ❌ | Google Custom Search Engine ID | `your-cx-id` |
| `BING_API_KEY` | ❌ | Bing Search API | `your-bing-key` |
| `NODE_ENV` | ❌ | Environment mode | `development` or `production` |

### GitHub Integration Setup

1. **Create Personal Access Token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate new token with `repo` and `user` scopes
   - Add to your `.env` file as `GITHUB_PERSONAL_ACCESS_TOKEN`

2. **Features Available:**
   - Repository browsing and analysis
   - Code structure analysis
   - File content examination
   - Commit history viewing

### Search Engine API Setup

**Google Custom Search:**
1. Create a Custom Search Engine at [cse.google.com](https://cse.google.com/)
2. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
3. Add both `GOOGLE_API_KEY` and `GOOGLE_CX` to your `.env`

**Bing Search:**
1. Subscribe to Bing Search API in [Azure Portal](https://portal.azure.com/)
2. Get your API key and add as `BING_API_KEY`

**DuckDuckGo:**
- No setup required! Works out of the box.

## 🏗️ Project Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for development and building
- TailwindCSS for styling
- shadcn/ui component library
- TanStack Query for state management

**Backend:**
- Node.js with Express
- TypeScript for type safety
- Drizzle ORM with PostgreSQL
- GitHub OAuth authentication
- Multer for file uploads

**Database:**
- PostgreSQL (Neon-backed on Replit)
- Automatic database provisioning
- Zero manual configuration
- Scalable and robust

**Local LLM Integration:**
- OpenAI-compatible API support
- Streaming response handling
- Multiple provider support

### Directory Structure

```
ai-assistant-studio-20250928/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── chat/          # Chat interface components
│   │   │   ├── layout/        # Layout components (sidebar, header, file tree)
│   │   │   ├── tools/         # Tool-specific components
│   │   │   └── ui/            # Reusable UI components (shadcn/ui)
│   │   ├── pages/             # Application pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── contexts/          # React contexts
│   │   └── lib/               # Utility libraries
│   └── index.html
├── server/                     # Express backend
│   ├── services/              # Business logic services
│   │   ├── file-service.ts    # File processing
│   │   ├── github-service.ts  # GitHub integration
│   │   ├── llm-service.ts     # LLM communication
│   │   ├── search-service.ts  # Web search
│   │   └── template-service.ts # Project templates
│   ├── routes.ts              # API endpoints
│   ├── localAuth.ts           # Local authentication
│   ├── localGitHubClient.ts   # GitHub client
│   └── storage.ts             # Database operations
├── shared/                     # Shared types and schemas
│   └── schema.ts              # Database schema definitions
├── scripts/                    # Utility scripts
│   ├── start.bat              # Windows startup script
│   ├── start.sh               # Unix startup script
│   └── *.ts                   # Development and deployment scripts
├── data/                       # Application data directory
├── uploads/                    # User uploaded files
├── generated-projects/         # Generated project templates
├── attached_assets/            # Attached assets and images
├── .config/                    # Configuration files
├── package.json               # Dependencies and scripts
├── drizzle.config.ts          # Database configuration
├── .env                       # Environment variables
└── README.md                  # This file
```

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Push database schema changes
npm run db:push

# Force push schema changes (if conflicts)
npm run db:push --force

# Generate database types
npm run db:generate
```

### Adding New Features

1. **Database Changes:**
   - Update `shared/schema.ts`
   - Run `npm run db:push`

2. **API Endpoints:**
   - Add routes in `server/routes.ts`
   - Implement business logic in `server/services/`

3. **Frontend Components:**
   - Create components in `client/src/components/`
   - Add pages in `client/src/pages/`

## 🔒 Security Considerations

### Local Hosting Security

1. **Database Security:**
   - PostgreSQL with secure connection pooling
   - Environment-based credentials
   - Regular backups recommended

2. **Session Security:**
   - Use a strong `SESSION_SECRET` (32+ characters)
   - Sessions expire after 1 week
   - Secure cookie settings

3. **API Key Management:**
   - Store API keys in `.env` file
   - Never commit `.env` to version control
   - Use environment-specific configurations

4. **File Upload Security:**
   - File size limits enforced
   - Type validation on uploads
   - Secure file storage

### Network Security

1. **Localhost Only:**
   - Application binds to `0.0.0.0:5000` by default
   - Use reverse proxy for external access
   - Consider HTTPS for production

2. **Firewall Configuration:**
   - Block unnecessary ports
   - Monitor network access

## 🚨 Troubleshooting

### Common Issues

**Database Issues:**
- PostgreSQL database is auto-configured via DATABASE_URL
- Check environment variables if connection fails
- Use standard PostgreSQL backup tools (pg_dump)

**Port 5000 Already in Use:**
```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Set different port
export PORT=3000  # Linux/macOS
set PORT=3000     # Windows
npm run dev
```

**LLM Connection Failed:**
- Verify Ollama/LMStudio is running
- Check endpoint URL and port
- Ensure model is loaded
- Test with curl: `curl http://localhost:11434/api/tags`

**GitHub Integration Not Working:**
- Verify Personal Access Token is valid
- Check token scopes (repo, user required)
- Test token: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

**Search Not Working:**
- DuckDuckGo should work without setup
- For Google/Bing, verify API keys are correct
- Check API quotas and billing

### Performance Optimization

**Database:**
- PostgreSQL provides excellent performance
- Connection pooling for optimal resource usage
- Automatic index optimization

**Frontend:**
- Browser caching enabled
- Gzip compression for production
- Code splitting implemented

**LLM Responses:**
- Streaming responses reduce wait time
- Connection pooling for multiple requests
- Local models eliminate API latency

## 📈 Production Deployment

### Production Environment

**Environment Variables:**
```env
NODE_ENV=production
SESSION_SECRET=your-production-secret
# ... other variables
```

**Build and Start:**
```bash
# Build the application
npm run build

# Start in production mode
NODE_ENV=production npm start
```

### Reverse Proxy Setup (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'ai-assistant-studio',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

## 🎯 What's New in This Version

### 🗄️ PostgreSQL Integration

- **Auto-Setup:** PostgreSQL database automatically configured on Replit
- **Scalable:** Robust database solution with connection pooling
- **Production-Ready:** Neon-backed PostgreSQL for reliability
- **Zero Config:** DATABASE_URL automatically provisioned

### 🚀 Enhanced Project Management

- **Project Templates:** Pre-built templates for React, Express, Next.js, Python FastAPI
- **File Organization:** Comprehensive project-based file management
- **GitHub Integration:** OAuth authentication with repository access
- **Template System:** Quick project initialization with best practices

### 🔧 Improved Architecture

- **Drizzle ORM:** Type-safe database operations
- **Session Management:** Secure PostgreSQL-backed sessions
- **Service Layer:** Modular architecture with dedicated services
- **Auto-Migration:** Database schema push with `npm run db:push`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Follow existing patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) for local LLM support
- [LMStudio](https://lmstudio.ai/) for model hosting
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Drizzle ORM](https://orm.drizzle.team/) for database management
- [PostgreSQL](https://www.postgresql.org/) for robust data storage
- [Neon](https://neon.tech/) for serverless PostgreSQL on Replit
- [Vite](https://vitejs.dev/) for build tooling

## 📞 Support

Having issues? Here's how to get help:

1. **Check Documentation:** Review this README and troubleshooting section
2. **Search Issues:** Look through existing GitHub issues
3. **Create Issue:** Report bugs or request features
4. **Community:** Join our discussions for help and tips

---

**🎉 Enjoy your AI Assistant Studio!**

*Keep your data private, your models local, and your productivity high.*

> **🆕 Now with auto-configured PostgreSQL database for scalable, production-ready deployment!**