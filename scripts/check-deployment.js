#!/usr/bin/env node

/**
 * Vercel Deployment Status Checker
 * 
 * This script checks the status of Vercel deployments for a project
 * and displays build logs and errors. It can be used after git pushes
 * to monitor deployment status.
 * 
 * Usage:
 *   node check-deployment.js --project <projectId> [options]
 * 
 * Environment variables:
 *   VERCEL_TOKEN - Vercel API token (required)
 *   VERCEL_TEAM_ID - Team ID (optional)
 */

const axios = require('axios');
const chalk = require('chalk');
const dotenv = require('dotenv');
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

// Configure command line options
program
  .requiredOption('--project <projectId>', 'Project ID or name')
  .option('--team <teamId>', 'Team ID', process.env.VERCEL_TEAM_ID)
  .option('--limit <number>', 'Number of deployments to check', '5')
  .option('--wait <seconds>', 'Time to wait between status checks in seconds', '10')
  .option('--timeout <minutes>', 'Maximum time to wait for deployment in minutes', '15')
  .option('--verbose', 'Show detailed logs', false)
  .option('--save-logs', 'Save logs to file', false)
  .option('--logs-dir <directory>', 'Directory to save logs', './deployment-logs')
  .parse(process.argv);

const options = program.opts();

// Validate required environment variables
if (!process.env.VERCEL_TOKEN) {
  console.error(chalk.red('Error: VERCEL_TOKEN environment variable is required'));
  console.error(chalk.yellow('Create a token at https://vercel.com/account/tokens'));
  process.exit(1);
}

// Configure API client
const apiClient = axios.create({
  baseURL: 'https://api.vercel.com',
  headers: {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Add team ID to request params if provided
const getTeamParam = () => {
  return options.team ? { teamId: options.team } : {};
};

/**
 * Get the latest deployments for a project
 */
async function getLatestDeployments() {
  try {
    const params = {
      limit: parseInt(options.limit),
      ...getTeamParam(),
    };

    const response = await apiClient.get(`/v6/deployments`, { params });
    
    // Filter deployments by project if project is specified
    const deployments = response.data.deployments.filter(deployment => 
      deployment.name === options.project || 
      deployment.projectId === options.project
    );

    if (deployments.length === 0) {
      console.error(chalk.red(`No deployments found for project: ${options.project}`));
      process.exit(1);
    }

    return deployments;
  } catch (error) {
    handleApiError(error, 'Failed to get deployments');
    process.exit(1);
  }
}

/**
 * Get a specific deployment by ID
 */
async function getDeployment(deploymentId) {
  try {
    const params = getTeamParam();
    const response = await apiClient.get(`/v13/deployments/${deploymentId}`, { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // Deployment not found
    }
    throw error;
  }
}

/**
 * Get build logs for a deployment
 */
async function getDeploymentEvents(deploymentId) {
  try {
    const params = {
      limit: 100,
      ...getTeamParam(),
    };

    const response = await apiClient.get(`/v2/deployments/${deploymentId}/events`, { params });
    return response.data.events || [];
  } catch (error) {
    if (options.verbose) {
      handleApiError(error, 'Failed to get deployment events');
    }
    return [];
  }
}

/**
 * Format deployment status with color
 */
function formatStatus(status) {
  switch (status) {
    case 'READY':
      return chalk.green('READY');
    case 'ERROR':
      return chalk.red('ERROR');
    case 'BUILDING':
      return chalk.blue('BUILDING');
    case 'QUEUED':
      return chalk.yellow('QUEUED');
    case 'CANCELED':
      return chalk.gray('CANCELED');
    default:
      return chalk.gray(status);
  }
}

/**
 * Format deployment event with color
 */
function formatEvent(event) {
  const timestamp = new Date(event.createdAt).toLocaleTimeString();
  const type = event.type;
  
  let formattedMessage = `[${timestamp}] `;
  
  switch (type) {
    case 'command':
      formattedMessage += chalk.cyan(`$ ${event.payload.text}`);
      break;
    case 'stdout':
      formattedMessage += event.payload.text;
      break;
    case 'stderr':
      formattedMessage += chalk.red(event.payload.text);
      break;
    case 'error':
      formattedMessage += chalk.bgRed.white(` ERROR `) + ' ' + chalk.red(event.payload.text);
      break;
    case 'warning':
      formattedMessage += chalk.bgYellow.black(` WARNING `) + ' ' + chalk.yellow(event.payload.text);
      break;
    case 'info':
      formattedMessage += chalk.blue(event.payload.text);
      break;
    case 'ready':
      formattedMessage += chalk.green(event.payload.text || 'Deployment ready!');
      break;
    default:
      formattedMessage += event.payload?.text || JSON.stringify(event.payload);
  }
  
  return formattedMessage;
}

/**
 * Handle API errors
 */
function handleApiError(error, message) {
  console.error(chalk.red(`${message}:`));
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error(chalk.red(`Status: ${error.response.status}`));
    console.error(chalk.red(`Error: ${JSON.stringify(error.response.data, null, 2)}`));
  } else if (error.request) {
    // The request was made but no response was received
    console.error(chalk.red('No response received from server'));
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Save logs to file
 */
function saveLogsToFile(deploymentId, events) {
  if (!options.saveLog) return;
  
  try {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(options.logsDir)) {
      fs.mkdirSync(options.logsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(options.logsDir, `deployment-${deploymentId}-${timestamp}.log`);
    
    const logContent = events.map(event => {
      const timestamp = new Date(event.createdAt).toISOString();
      return `[${timestamp}] [${event.type}] ${event.payload?.text || JSON.stringify(event.payload)}`;
    }).join('\n');
    
    fs.writeFileSync(filename, logContent);
    console.log(chalk.green(`Logs saved to ${filename}`));
  } catch (error) {
    console.error(chalk.red(`Failed to save logs: ${error.message}`));
  }
}

/**
 * Sleep for a specified number of seconds
 */
async function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Wait for deployment to complete with exponential backoff
 */
async function waitForDeployment(deploymentId) {
  const startTime = Date.now();
  const timeoutMs = parseInt(options.timeout) * 60 * 1000;
  let waitTime = parseInt(options.wait);
  let lastStatus = null;
  let lastEventCount = 0;
  
  console.log(chalk.blue(`Monitoring deployment: ${deploymentId}`));
  console.log(chalk.blue(`Timeout set to ${options.timeout} minutes`));
  
  while (true) {
    // Check if timeout has been reached
    if (Date.now() - startTime > timeoutMs) {
      console.error(chalk.red(`Timeout reached after ${options.timeout} minutes`));
      return false;
    }
    
    try {
      // Get deployment status
      const deployment = await getDeployment(deploymentId);
      
      if (!deployment) {
        console.error(chalk.red(`Deployment ${deploymentId} not found`));
        return false;
      }
      
      const currentStatus = deployment.readyState;
      
      // Print status if changed
      if (currentStatus !== lastStatus) {
        console.log(chalk.blue(`Deployment status: ${formatStatus(currentStatus)}`));
        lastStatus = currentStatus;
      }
      
      // Get deployment events/logs
      const events = await getDeploymentEvents(deploymentId);
      
      // Print new events
      if (events.length > lastEventCount) {
        const newEvents = events.slice(0, events.length - lastEventCount);
        
        if (options.verbose) {
          newEvents.forEach(event => {
            console.log(formatEvent(event));
          });
        } else if (newEvents.some(e => e.type === 'error' || e.type === 'stderr')) {
          // Only print errors in non-verbose mode
          newEvents
            .filter(e => e.type === 'error' || e.type === 'stderr')
            .forEach(event => {
              console.log(formatEvent(event));
            });
        }
        
        lastEventCount = events.length;
      }
      
      // Check if deployment is complete
      if (currentStatus === 'READY') {
        console.log(chalk.green(`Deployment successful! URL: ${deployment.url}`));
        
        if (options.saveLog) {
          saveLogsToFile(deploymentId, events);
        }
        
        return true;
      } else if (currentStatus === 'ERROR') {
        console.error(chalk.red(`Deployment failed!`));
        
        // Print error details
        if (deployment.errorMessage) {
          console.error(chalk.red(`Error message: ${deployment.errorMessage}`));
        }
        if (deployment.errorCode) {
          console.error(chalk.red(`Error code: ${deployment.errorCode}`));
        }
        if (deployment.errorStep) {
          console.error(chalk.red(`Error step: ${deployment.errorStep}`));
        }
        
        // Print the last few error events for context
        const errorEvents = events.filter(e => e.type === 'error' || e.type === 'stderr');
        if (errorEvents.length > 0) {
          console.error(chalk.red(`Last ${Math.min(5, errorEvents.length)} error events:`));
          errorEvents.slice(-5).forEach(event => {
            console.log(formatEvent(event));
          });
        }
        
        if (options.saveLog) {
          saveLogsToFile(deploymentId, events);
        }
        
        return false;
      } else if (currentStatus === 'CANCELED') {
        console.log(chalk.yellow(`Deployment was canceled`));
        return false;
      }
      
      // Exponential backoff with a cap
      waitTime = Math.min(waitTime * 1.5, 60);
      console.log(chalk.blue(`Waiting ${Math.round(waitTime)} seconds for next check...`));
      await sleep(waitTime);
      
    } catch (error) {
      console.error(chalk.red(`Error checking deployment status: ${error.message}`));
      
      // Exponential backoff for errors
      waitTime = Math.min(waitTime * 2, 60);
      console.log(chalk.yellow(`Retrying in ${Math.round(waitTime)} seconds...`));
      await sleep(waitTime);
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(chalk.blue(`Checking deployments for project: ${options.project}`));
    
    // Get latest deployments
    const deployments = await getLatestDeployments();
    
    if (deployments.length === 0) {
      console.log(chalk.yellow('No deployments found'));
      return;
    }
    
    // Display latest deployments
    console.log(chalk.blue(`Latest ${deployments.length} deployments:`));
    deployments.forEach((deployment, index) => {
      const createdAt = new Date(deployment.createdAt).toLocaleString();
      console.log(
        `${index + 1}. ${deployment.uid} - ${formatStatus(deployment.readyState)} - ` +
        `${deployment.target || 'unknown'} - ${createdAt}`
      );
    });
    
    // Monitor the most recent deployment
    const latestDeployment = deployments[0];
    console.log(chalk.blue(`\nMonitoring latest deployment: ${latestDeployment.uid}`));
    
    // Wait for deployment to complete
    await waitForDeployment(latestDeployment.uid);
    
  } catch (error) {
    console.error(chalk.red(`Unexpected error: ${error.message}`));
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the script
main();
