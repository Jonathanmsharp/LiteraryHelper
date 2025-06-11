/**
 * Vercel Deployment Utilities
 * 
 * A collection of utility functions for interacting with the Vercel API
 * to check deployment status, get logs, and monitor deployments.
 * 
 * @module vercel-utils
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Deployment status constants
 */
const DeploymentStatus = {
  READY: 'READY',
  ERROR: 'ERROR',
  BUILDING: 'BUILDING',
  QUEUED: 'QUEUED',
  CANCELED: 'CANCELED',
};

/**
 * Create an API client with authentication
 * 
 * @param {string} token - Vercel API token (defaults to VERCEL_TOKEN env var)
 * @returns {Object} Axios instance configured for Vercel API
 */
function createApiClient(token = process.env.VERCEL_TOKEN) {
  if (!token) {
    throw new Error('Vercel API token is required. Set VERCEL_TOKEN environment variable or pass it as a parameter.');
  }

  return axios.create({
    baseURL: 'https://api.vercel.com',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Get team parameter for API requests
 * 
 * @param {string} teamId - Team ID (optional)
 * @returns {Object} Query parameters object with teamId if provided
 */
function getTeamParam(teamId = process.env.VERCEL_TEAM_ID) {
  return teamId ? { teamId } : {};
}

/**
 * Get the latest deployments for a project
 * 
 * @param {Object} options - Options object
 * @param {string} options.projectId - Project ID or name
 * @param {string} options.teamId - Team ID (optional)
 * @param {number} options.limit - Maximum number of deployments to return (default: 5)
 * @param {string} options.token - Vercel API token (optional)
 * @returns {Promise<Array>} Array of deployment objects
 */
async function getLatestDeployments({ projectId, teamId, limit = 5, token }) {
  const apiClient = createApiClient(token);
  
  try {
    const params = {
      limit,
      ...getTeamParam(teamId),
    };

    const response = await apiClient.get('/v6/deployments', { params });
    
    // Filter deployments by project if project is specified
    const deployments = projectId 
      ? response.data.deployments.filter(deployment => 
          deployment.name === projectId || 
          deployment.projectId === projectId
        )
      : response.data.deployments;

    return deployments;
  } catch (error) {
    handleApiError(error, 'Failed to get deployments');
    return [];
  }
}

/**
 * Get a specific deployment by ID
 * 
 * @param {Object} options - Options object
 * @param {string} options.deploymentId - Deployment ID
 * @param {string} options.teamId - Team ID (optional)
 * @param {string} options.token - Vercel API token (optional)
 * @returns {Promise<Object|null>} Deployment object or null if not found
 */
async function getDeployment({ deploymentId, teamId, token }) {
  const apiClient = createApiClient(token);
  
  try {
    const params = getTeamParam(teamId);
    const response = await apiClient.get(`/v13/deployments/${deploymentId}`, { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // Deployment not found
    }
    handleApiError(error, `Failed to get deployment ${deploymentId}`);
    return null;
  }
}

/**
 * Get events/logs for a deployment
 * 
 * @param {Object} options - Options object
 * @param {string} options.deploymentId - Deployment ID
 * @param {string} options.teamId - Team ID (optional)
 * @param {number} options.limit - Maximum number of events to return (default: 100)
 * @param {string} options.since - Timestamp to get events since (optional)
 * @param {string} options.token - Vercel API token (optional)
 * @returns {Promise<Array>} Array of event objects
 */
async function getDeploymentEvents({ deploymentId, teamId, limit = 100, since, token }) {
  const apiClient = createApiClient(token);
  
  try {
    const params = {
      limit,
      ...getTeamParam(teamId),
    };
    
    if (since) {
      params.since = since;
    }

    const response = await apiClient.get(`/v2/deployments/${deploymentId}/events`, { params });
    return response.data.events || [];
  } catch (error) {
    handleApiError(error, `Failed to get events for deployment ${deploymentId}`);
    return [];
  }
}

/**
 * Check if a deployment is complete (either READY or ERROR)
 * 
 * @param {Object} options - Options object
 * @param {string} options.deploymentId - Deployment ID
 * @param {string} options.teamId - Team ID (optional)
 * @param {string} options.token - Vercel API token (optional)
 * @returns {Promise<Object>} Object with status, isComplete, isSuccess, and deployment data
 */
async function checkDeploymentStatus({ deploymentId, teamId, token }) {
  const deployment = await getDeployment({ deploymentId, teamId, token });
  
  if (!deployment) {
    return {
      status: 'NOT_FOUND',
      isComplete: true,
      isSuccess: false,
      deployment: null,
    };
  }
  
  const status = deployment.readyState;
  const isComplete = [
    DeploymentStatus.READY, 
    DeploymentStatus.ERROR, 
    DeploymentStatus.CANCELED
  ].includes(status);
  
  const isSuccess = status === DeploymentStatus.READY;
  
  return {
    status,
    isComplete,
    isSuccess,
    deployment,
  };
}

/**
 * Wait for a deployment to complete with polling
 * 
 * @param {Object} options - Options object
 * @param {string} options.deploymentId - Deployment ID
 * @param {string} options.teamId - Team ID (optional)
 * @param {number} options.timeout - Timeout in milliseconds (default: 15 minutes)
 * @param {number} options.pollInterval - Initial polling interval in milliseconds (default: 5 seconds)
 * @param {Function} options.onUpdate - Callback function called on each status update (optional)
 * @param {string} options.token - Vercel API token (optional)
 * @returns {Promise<Object>} Final deployment status object
 */
async function waitForDeployment({ 
  deploymentId, 
  teamId, 
  timeout = 15 * 60 * 1000, 
  pollInterval = 5000,
  onUpdate,
  token 
}) {
  const startTime = Date.now();
  let currentPollInterval = pollInterval;
  let lastStatus = null;
  
  while (true) {
    // Check if timeout has been reached
    if (Date.now() - startTime > timeout) {
      const timeoutError = new Error(`Timeout reached after ${timeout / 1000 / 60} minutes`);
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }
    
    // Get current status
    const statusResult = await checkDeploymentStatus({ deploymentId, teamId, token });
    
    // Call onUpdate callback if provided and status changed
    if (onUpdate && statusResult.status !== lastStatus) {
      onUpdate(statusResult);
      lastStatus = statusResult.status;
    }
    
    // If deployment is complete, return the result
    if (statusResult.isComplete) {
      return statusResult;
    }
    
    // Exponential backoff with a cap
    currentPollInterval = Math.min(currentPollInterval * 1.5, 60000); // Max 1 minute
    
    // Wait before next poll
    await sleep(currentPollInterval);
  }
}

/**
 * Get the latest deployment for a project and wait for it to complete
 * 
 * @param {Object} options - Options object
 * @param {string} options.projectId - Project ID or name
 * @param {string} options.teamId - Team ID (optional)
 * @param {number} options.timeout - Timeout in milliseconds (default: 15 minutes)
 * @param {number} options.pollInterval - Initial polling interval in milliseconds (default: 5 seconds)
 * @param {Function} options.onUpdate - Callback function called on each status update (optional)
 * @param {string} options.token - Vercel API token (optional)
 * @returns {Promise<Object>} Final deployment status object
 */
async function waitForLatestDeployment(options) {
  const deployments = await getLatestDeployments({
    projectId: options.projectId,
    teamId: options.teamId,
    limit: 1,
    token: options.token,
  });
  
  if (!deployments || deployments.length === 0) {
    throw new Error(`No deployments found for project: ${options.projectId}`);
  }
  
  const latestDeployment = deployments[0];
  
  return waitForDeployment({
    ...options,
    deploymentId: latestDeployment.uid,
  });
}

/**
 * Format error details from a deployment
 * 
 * @param {Object} deployment - Deployment object
 * @returns {string} Formatted error message
 */
function formatDeploymentError(deployment) {
  if (!deployment) return 'Unknown error (deployment not found)';
  
  const parts = [];
  
  if (deployment.errorMessage) {
    parts.push(`Error message: ${deployment.errorMessage}`);
  }
  
  if (deployment.errorCode) {
    parts.push(`Error code: ${deployment.errorCode}`);
  }
  
  if (deployment.errorStep) {
    parts.push(`Error step: ${deployment.errorStep}`);
  }
  
  if (deployment.errorLink) {
    parts.push(`More info: ${deployment.errorLink}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : 'Unknown error (no details available)';
}

/**
 * Handle API errors
 * 
 * @param {Error} error - Error object
 * @param {string} message - Custom message prefix
 */
function handleApiError(error, message) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error(`${message}: Status ${error.response.status}`);
    console.error(error.response.data);
  } else if (error.request) {
    // The request was made but no response was received
    console.error(`${message}: No response received`);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error(`${message}: ${error.message}`);
  }
}

/**
 * Sleep for a specified number of milliseconds
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  // Constants
  DeploymentStatus,
  
  // Core API functions
  createApiClient,
  getLatestDeployments,
  getDeployment,
  getDeploymentEvents,
  checkDeploymentStatus,
  
  // Monitoring functions
  waitForDeployment,
  waitForLatestDeployment,
  
  // Utility functions
  formatDeploymentError,
  sleep,
};
