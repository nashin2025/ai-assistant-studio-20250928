#!/bin/bash

# 🚀 AI Assistant Studio - One-Click Setup & Run Script
# This script sets up and runs your AI Assistant Studio with enhanced Monaco Editor

echo "🎯 AI Assistant Studio - One-Click Setup & Run"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is available
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

NODE_VERSION=$(node -v)
print_success "Node.js version: $NODE_VERSION"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

NPM_VERSION=$(npm -v)
print_success "npm version: $NPM_VERSION"

echo ""

# Install dependencies if node_modules doesn't exist
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_success "Dependencies already installed"
fi

echo ""

# Check if database is available
print_status "Checking database connection..."
if [ -n "$DATABASE_URL" ]; then
    print_success "Database URL found: ${DATABASE_URL:0:20}..."
else
    print_warning "No DATABASE_URL found. Database will be created automatically if needed."
fi

echo ""

# Setup database schema if needed
print_status "Setting up database schema..."
npm run db:push --force 2>/dev/null
if [ $? -eq 0 ]; then
    print_success "Database schema synchronized"
else
    print_warning "Database schema sync skipped (may not be needed)"
fi

echo ""

# Check for essential files
print_status "Verifying application files..."

ESSENTIAL_FILES=(
    "client/src/pages/file-manager.tsx"
    "server/index.ts"
    "server/routes.ts"
    "package.json"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file"
    else
        print_error "✗ Missing: $file"
        exit 1
    fi
done

echo ""

# Check if port 5000 is available
print_status "Checking if port 5000 is available..."
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    print_warning "Port 5000 is already in use. The app may restart automatically."
else
    print_success "Port 5000 is available"
fi

echo ""

# Start the application
print_status "Starting AI Assistant Studio..."
echo ""
echo "🚀 Features included:"
echo "   ✨ Enhanced Monaco Editor with Replit-like experience"
echo "   🔍 Real-time error checking and diagnostics"
echo "   🧠 Advanced IntelliSense and code completion"
echo "   🎨 Professional code formatting with format-on-save"
echo "   🔧 Multi-language linting (JS/TS/Python/JSON)"
echo "   📊 Interactive diagnostics panel"
echo "   ⌨️  Professional keyboard shortcuts"
echo "   💾 File management with drag-and-drop uploads"
echo "   🤖 AI chat integration with code saving"
echo ""
echo "🌐 Application will be available at: http://localhost:5000"
echo ""
print_status "Starting development server..."
echo ""

# Set NODE_ENV to development if not set
export NODE_ENV=${NODE_ENV:-development}

# Start the application
npm run dev