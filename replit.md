# AI Assistant Studio

## Overview

AI Assistant Studio is a professional AI development companion that integrates local LLM capabilities with web search, code analysis, and document processing features. The application provides a comprehensive chat interface with multi-modal support, allowing users to interact with AI models while leveraging external integrations like GitHub, search engines, and file analysis tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React + TypeScript SPA**: Built using React 18 with TypeScript, utilizing Vite for development and build tooling. The frontend follows a component-based architecture with clear separation of concerns.

**UI Framework**: Implements shadcn/ui component library with Radix UI primitives for accessibility and consistent design. Uses Tailwind CSS for styling with a custom dark theme configuration.

**State Management**: Employs TanStack React Query for server state management and caching, with custom hooks for specific domain logic (chat, file upload, LLM interactions).

**Routing**: Uses Wouter for client-side routing with a main layout containing sidebar navigation and dynamic content areas.

**Key Frontend Components**:
- Chat interface with message threading and file attachment support
- Multi-tab pages for different AI tools (code analysis, web search, document analysis)
- Real-time context panel showing active configurations
- File upload zones with drag-and-drop functionality

### Backend Architecture

**Node.js + Express**: RESTful API server built with Express.js, using ES modules and TypeScript for type safety.

**Database Layer**: PostgreSQL database with Drizzle ORM for type-safe database operations. Uses connection pooling via @neondatabase/serverless for scalability.

**Service Architecture**: Modular service layer with dedicated services for:
- LLM interactions (local and remote model support)
- Search engine integration (Google, Bing, DuckDuckGo)
- File processing and analysis
- GitHub integration with OAuth
- Project and conversation management

**API Design**: RESTful endpoints with consistent error handling and response formatting. Implements file upload handling with Multer for multipart data.

### Data Storage Solutions

**Primary Database**: PostgreSQL with the following core entities:
- Users and authentication
- Conversations and messages with metadata support
- Projects with GitHub integration
- File storage with analysis metadata
- LLM and search engine configurations

**Database Schema**: Uses Drizzle ORM with migration support, featuring:
- UUID primary keys with automatic generation
- JSONB fields for flexible metadata storage
- Timestamp tracking for created/updated records
- Foreign key relationships with proper constraints

### Authentication and Authorization

**GitHub OAuth Integration**: Primary authentication mechanism through GitHub OAuth with token refresh capabilities. Implements secure token storage and validation.

**Session Management**: Uses connect-pg-simple for PostgreSQL-backed session storage with Express sessions.

### External Service Integrations

**GitHub Integration**: 
- Repository browsing and management
- Code analysis and file tree traversal
- OAuth-based authentication with automatic token refresh

**Search Engine APIs**:
- Multi-provider search (Google, Bing, DuckDuckGo)
- Configurable API key management
- Result aggregation and deduplication

**LLM Integration**:
- Support for local and remote LLM endpoints
- Configurable temperature and token limits
- Multiple model support with provider-agnostic interface

**File Processing**:
- Multi-format file upload and storage
- Automatic file type detection and analysis
- Code metrics extraction for programming files
- Document content extraction and summarization

### Development and Deployment

**Build System**: Vite-based development with hot module replacement and TypeScript compilation. Production builds create optimized client bundles and Node.js server artifacts.

**Database Migrations**: Drizzle Kit handles schema migrations with PostgreSQL dialect support.

**Environment Configuration**: Environment-based configuration for database connections, API keys, and service endpoints.