#!/bin/bash
# push-and-monitor.sh
#
# This script demonstrates a typical workflow for pushing code to GitHub
# and monitoring the subsequent Vercel deployment.
#
# Usage: ./scripts/push-and-monitor.sh [branch] [options]
#
# Example: ./scripts/push-and-monitor.sh main --verbose

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
BRANCH=${1:-main}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="LiteraryHelper"
WAIT_TIME=10 # seconds to wait for deployment to start

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
  echo -e "${YELLOW}Warning: VERCEL_TOKEN environment variable is not set${NC}"
  echo -e "You can set it by running: ${GREEN}export VERCEL_TOKEN=your_token${NC}"
  echo -e "Create a token at: ${BLUE}https://vercel.com/account/tokens${NC}"
  echo -e "${YELLOW}Continuing without monitoring deployment...${NC}"
  SKIP_MONITOR=true
fi

# Function to display a spinner while waiting
spinner() {
  local pid=$1
  local delay=0.1
  local spinstr='|/-\'
  while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
    local temp=${spinstr#?}
    printf " [%c]  " "$spinstr"
    local spinstr=$temp${spinstr%"$temp"}
    sleep $delay
    printf "\b\b\b\b\b\b"
  done
  printf "    \b\b\b\b"
}

# Function to print section headers
print_section() {
  echo -e "\n${PURPLE}===${NC} ${CYAN}$1${NC} ${PURPLE}===${NC}\n"
}

# Function to check if there are changes to commit
has_changes() {
  git status --porcelain | grep -q -v '^??'
}

# Function to check if the branch exists on remote
branch_exists_on_remote() {
  git ls-remote --heads origin $BRANCH | grep -q $BRANCH
}

# Start script execution
print_section "LiteraryHelper Deployment Workflow"
echo -e "Branch: ${GREEN}$BRANCH${NC}"
echo -e "Project: ${GREEN}$PROJECT_NAME${NC}"

# Check if git is available
if ! command -v git &> /dev/null; then
  echo -e "${RED}Error: git is not installed${NC}"
  exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
  echo -e "${RED}Error: Not in a git repository${NC}"
  exit 1
fi

# Check for uncommitted changes
print_section "Checking for uncommitted changes"
if has_changes; then
  echo -e "${YELLOW}You have uncommitted changes:${NC}"
  git status --short
  
  read -p "Do you want to commit these changes? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter commit message: " commit_message
    git add .
    git commit -m "$commit_message"
    echo -e "${GREEN}Changes committed${NC}"
  else
    echo -e "${YELLOW}Continuing with push without committing changes${NC}"
  fi
else
  echo -e "${GREEN}No uncommitted changes${NC}"
fi

# Check if branch exists locally
print_section "Checking branch status"
if ! git show-ref --quiet refs/heads/$BRANCH; then
  echo -e "${YELLOW}Branch $BRANCH doesn't exist locally${NC}"
  
  # Check if branch exists on remote
  if branch_exists_on_remote; then
    echo -e "${YELLOW}Branch $BRANCH exists on remote. Checking out...${NC}"
    git checkout $BRANCH
  else
    echo -e "${YELLOW}Creating new branch $BRANCH...${NC}"
    git checkout -b $BRANCH
  fi
else
  # Switch to the branch if not already on it
  if [ "$(git symbolic-ref --short HEAD)" != "$BRANCH" ]; then
    echo -e "${YELLOW}Switching to branch $BRANCH...${NC}"
    git checkout $BRANCH
  else
    echo -e "${GREEN}Already on branch $BRANCH${NC}"
  fi
fi

# Pull latest changes
print_section "Pulling latest changes"
if branch_exists_on_remote; then
  echo -e "Pulling latest changes from origin/$BRANCH..."
  git pull origin $BRANCH
  echo -e "${GREEN}Pull complete${NC}"
else
  echo -e "${YELLOW}Branch doesn't exist on remote yet. Skipping pull.${NC}"
fi

# Push to GitHub
print_section "Pushing to GitHub"
echo -e "Pushing to origin/$BRANCH..."
git push origin $BRANCH
echo -e "${GREEN}Push successful!${NC}"

# Skip monitoring if VERCEL_TOKEN is not set
if [ "$SKIP_MONITOR" = true ]; then
  print_section "Deployment Monitoring Skipped"
  echo -e "${YELLOW}Set VERCEL_TOKEN to enable automatic deployment monitoring${NC}"
  exit 0
fi

# Wait for deployment to start
print_section "Waiting for deployment to start"
echo -e "Giving Vercel a moment to register the deployment..."
for i in $(seq $WAIT_TIME -1 1); do
  echo -ne "\rWaiting ${YELLOW}$i${NC} seconds..."
  sleep 1
done
echo -e "\r${GREEN}Done waiting!${NC}                "

# Monitor deployment
print_section "Monitoring Deployment"
echo -e "Starting deployment monitor for ${BLUE}$PROJECT_NAME${NC}..."

# Pass all remaining arguments to the check-deploy script
"$SCRIPT_DIR/check-deploy.sh" --project "$PROJECT_NAME" "${@:2}"
DEPLOY_STATUS=$?

if [ $DEPLOY_STATUS -eq 0 ]; then
  print_section "Deployment Successful"
  echo -e "${GREEN}Your changes are now live!${NC}"
  
  # Get the deployment URL (this would require additional API calls)
  echo -e "Visit: ${BLUE}https://$PROJECT_NAME.vercel.app${NC}"
else
  print_section "Deployment Failed"
  echo -e "${RED}Deployment encountered issues. Check the logs above for details.${NC}"
  echo -e "You can also check the Vercel dashboard: ${BLUE}https://vercel.com/dashboard${NC}"
fi

exit $DEPLOY_STATUS
