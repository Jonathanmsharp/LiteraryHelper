#!/bin/bash

# check-deploy.sh - A simple wrapper script to check Vercel deployment status
# for the LiteraryHelper project

# Directory setup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
NODE_SCRIPT="$SCRIPT_DIR/check-deployment.js"

# Default values
PROJECT_NAME="LiteraryHelper"
TIMEOUT=15
WAIT=10
LOGS_DIR="$ROOT_DIR/deployment-logs"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display usage information
function show_usage {
  echo -e "${BLUE}Vercel Deployment Status Checker${NC}"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -p, --project NAME    Project name (default: $PROJECT_NAME)"
  echo "  -t, --team ID         Team ID (optional)"
  echo "  -l, --limit NUM       Number of deployments to check (default: 5)"
  echo "  -w, --wait SEC        Time to wait between checks in seconds (default: $WAIT)"
  echo "  -m, --timeout MIN     Maximum time to wait in minutes (default: $TIMEOUT)"
  echo "  -v, --verbose         Show detailed logs"
  echo "  -s, --save-logs       Save logs to file"
  echo "  -d, --logs-dir DIR    Directory to save logs (default: $LOGS_DIR)"
  echo "  -h, --help            Show this help message"
  echo ""
  echo "Environment variables:"
  echo "  VERCEL_TOKEN          Vercel API token (required)"
  echo "  VERCEL_TEAM_ID        Team ID (optional)"
  echo ""
  echo "Example:"
  echo "  $0 --verbose"
  echo "  $0 --project custom-project-name --team team_123456"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed${NC}"
  exit 1
fi

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
  echo -e "${YELLOW}Warning: VERCEL_TOKEN environment variable is not set${NC}"
  echo -e "You can set it by running: ${GREEN}export VERCEL_TOKEN=your_token${NC}"
  echo -e "Create a token at: ${BLUE}https://vercel.com/account/tokens${NC}"
  exit 1
fi

# Parse command line arguments
PARAMS=""
while (( "$#" )); do
  case "$1" in
    -p|--project)
      PROJECT_NAME="$2"
      shift 2
      ;;
    -t|--team)
      TEAM_ID="$2"
      shift 2
      ;;
    -l|--limit)
      LIMIT="$2"
      shift 2
      ;;
    -w|--wait)
      WAIT="$2"
      shift 2
      ;;
    -m|--timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -v|--verbose)
      VERBOSE="--verbose"
      shift
      ;;
    -s|--save-logs)
      SAVE_LOGS="--save-logs"
      shift
      ;;
    -d|--logs-dir)
      LOGS_DIR="$2"
      shift 2
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    --) # end argument parsing
      shift
      break
      ;;
    -*|--*=) # unsupported flags
      echo -e "${RED}Error: Unsupported flag $1${NC}" >&2
      show_usage
      exit 1
      ;;
    *) # preserve positional arguments
      PARAMS="$PARAMS $1"
      shift
      ;;
  esac
done

# Set positional arguments in their proper place
eval set -- "$PARAMS"

# Check if the Node script exists
if [ ! -f "$NODE_SCRIPT" ]; then
  echo -e "${YELLOW}Node script not found. Creating it...${NC}"
  
  # Create scripts directory if it doesn't exist
  mkdir -p "$SCRIPT_DIR"
  
  # Check if the script was created in a previous step
  if [ ! -f "$ROOT_DIR/scripts/check-deployment.js" ]; then
    echo -e "${RED}Error: check-deployment.js script not found.${NC}"
    echo -e "Please run the script that creates check-deployment.js first."
    exit 1
  else
    # Copy the script to the expected location
    cp "$ROOT_DIR/scripts/check-deployment.js" "$NODE_SCRIPT"
    chmod +x "$NODE_SCRIPT"
  fi
fi

# Build the command
CMD="node $NODE_SCRIPT --project $PROJECT_NAME --wait $WAIT --timeout $TIMEOUT"

# Add optional parameters
if [ ! -z "$TEAM_ID" ]; then
  CMD="$CMD --team $TEAM_ID"
elif [ ! -z "$VERCEL_TEAM_ID" ]; then
  CMD="$CMD --team $VERCEL_TEAM_ID"
fi

if [ ! -z "$LIMIT" ]; then
  CMD="$CMD --limit $LIMIT"
fi

if [ ! -z "$VERBOSE" ]; then
  CMD="$CMD $VERBOSE"
fi

if [ ! -z "$SAVE_LOGS" ]; then
  CMD="$CMD $SAVE_LOGS --logs-dir $LOGS_DIR"
fi

# Print the command if verbose
if [ ! -z "$VERBOSE" ]; then
  echo -e "${BLUE}Executing: $CMD${NC}"
fi

# Execute the command
eval $CMD

# Exit with the same status as the Node script
exit $?
