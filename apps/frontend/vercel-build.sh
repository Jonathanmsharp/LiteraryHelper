#!/bin/bash
# vercel-build.sh - Custom build script for Vercel deployment
# This script handles the build process for the LiteraryHelper monorepo
# It ensures pnpm is installed and builds packages in the correct order

set -e # Exit immediately if a command exits with a non-zero status

# Print colorful logs for better visibility
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Vercel build process for LiteraryHelper...${NC}"

# Navigate to the workspace root (two directories up from the frontend app)
cd "$(dirname "$0")/../.."
WORKSPACE_ROOT=$(pwd)
echo -e "${GREEN}Workspace root: ${WORKSPACE_ROOT}${NC}"

# Check if pnpm is installed, install if not
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm@8
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install pnpm. Falling back to npm.${NC}"
        export USE_NPM=true
    else
        echo -e "${GREEN}pnpm installed successfully.${NC}"
    fi
else
    echo -e "${GREEN}pnpm is already installed: $(pnpm --version)${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
if [ "$USE_NPM" = true ]; then
    echo -e "${YELLOW}Using npm for dependency installation${NC}"
    npm install --legacy-peer-deps
else
    echo -e "${GREEN}Using pnpm for dependency installation${NC}"
    pnpm install --no-frozen-lockfile
fi

# Ensure the TypeScript compiler is available
if ! command -v tsc &> /dev/null; then
    echo -e "${YELLOW}TypeScript compiler not found. Installing globally...${NC}"
    if [ "$USE_NPM" = true ]; then
        npm install -g typescript
    else
        pnpm add -g typescript
    fi
    echo -e "${GREEN}TypeScript compiler installed.${NC}"
fi

# Build the types package first
echo -e "${YELLOW}Building @literaryhelper/types package...${NC}"
if [ "$USE_NPM" = true ]; then
    cd packages/types && npm run build:bin && cd "$WORKSPACE_ROOT"
else
    pnpm --filter "@literaryhelper/types" run build:bin
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build types package. Exiting.${NC}"
    exit 1
fi
echo -e "${GREEN}Types package built successfully.${NC}"

# Build the frontend app
echo -e "${YELLOW}Building frontend app...${NC}"
if [ "$USE_NPM" = true ]; then
    cd apps/frontend && npm run build && cd "$WORKSPACE_ROOT"
else
    pnpm --filter "frontend" build
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build frontend app. Exiting.${NC}"
    exit 1
fi
echo -e "${GREEN}Frontend app built successfully.${NC}"

# Copy the .next directory to the expected location
if [ -d "apps/frontend/.next" ]; then
    echo -e "${GREEN}Build artifacts found at apps/frontend/.next${NC}"
else
    echo -e "${RED}Build artifacts not found at expected location.${NC}"
    exit 1
fi

echo -e "${GREEN}Vercel build process completed successfully!${NC}"
exit 0
