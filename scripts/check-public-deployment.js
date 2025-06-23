#!/usr/bin/env node

/**
 * Public Deployment Status Checker
 * 
 * Tests a Vercel deployment without requiring API tokens.
 * Checks main page, API endpoints, and verifies demo mode functionality.
 * 
 * Usage:
 *   node check-public-deployment.js https://your-app.vercel.app
 *   node check-public-deployment.js --verbose https://your-app.vercel.app
 *   node check-public-deployment.js --timeout 10000 https://your-app.vercel.app
 */

const { performance } = require('perf_hooks');

// Configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 2000; // 2 seconds

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Parse command line arguments
const args = process.argv.slice(2);
let url = null;
let verbose = false;
let timeout = DEFAULT_TIMEOUT;
let retries = DEFAULT_RETRIES;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--verbose' || arg === '-v') {
    verbose = true;
  } else if (arg === '--timeout' || arg === '-t') {
    timeout = parseInt(args[++i], 10) || DEFAULT_TIMEOUT;
  } else if (arg === '--retries' || arg === '-r') {
    retries = parseInt(args[++i], 10) || DEFAULT_RETRIES;
  } else if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  } else if (!url && !arg.startsWith('-')) {
    url = arg;
  }
}

if (!url) {
  console.error(`${colors.red}Error: URL is required${colors.reset}`);
  printHelp();
  process.exit(1);
}

// Ensure URL has protocol
if (!url.startsWith('http://') && !url.startsWith('https://')) {
  url = 'https://' + url;
}

// Remove trailing slash if present
if (url.endsWith('/')) {
  url = url.slice(0, -1);
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
${colors.bright}Public Deployment Status Checker${colors.reset}

Tests a Vercel deployment without requiring API tokens.
Checks main page, API endpoints, and verifies demo mode functionality.

${colors.bright}Usage:${colors.reset}
  node check-public-deployment.js [options] <url>

${colors.bright}Options:${colors.reset}
  --verbose, -v       Show detailed information including headers
  --timeout, -t       Request timeout in milliseconds (default: ${DEFAULT_TIMEOUT})
  --retries, -r       Number of retry attempts (default: ${DEFAULT_RETRIES})
  --help, -h          Show this help information

${colors.bright}Example:${colors.reset}
  node check-public-deployment.js https://literary-helper.vercel.app
  node check-public-deployment.js --verbose https://literary-helper.vercel.app
  `);
}

/**
 * Make an HTTP request with timing and retries
 * @param {string} endpoint - The endpoint to request (will be appended to base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Response data with timing information
 */
async function makeRequest(endpoint, options = {}) {
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${url}${endpoint}`;
  const startTime = performance.now();
  let response = null;
  let error = null;
  let attempt = 0;
  let responseTime = 0;
  
  // Add default timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;
  
  while (attempt < retries) {
    attempt++;
    try {
      const fetchStart = performance.now();
      response = await fetch(fullUrl, options);
      responseTime = performance.now() - fetchStart;
      clearTimeout(timeoutId);
      break;
    } catch (err) {
      error = err;
      if (attempt < retries) {
        console.log(`${colors.yellow}Attempt ${attempt} failed, retrying in ${DEFAULT_RETRY_DELAY/1000}s...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, DEFAULT_RETRY_DELAY));
      }
    }
  }
  
  const totalTime = performance.now() - startTime;
  
  if (error) {
    return {
      success: false,
      error: error.name === 'AbortError' ? 'Request timed out' : error.message,
      endpoint,
      responseTime: null,
      totalTime,
      status: null,
      statusText: null,
      headers: null,
      body: null,
      attempts: attempt
    };
  }
  
  let body = null;
  let bodyText = null;
  
  try {
    bodyText = await response.text();
    try {
      // Try to parse as JSON
      body = JSON.parse(bodyText);
    } catch {
      // Not JSON, use text
      body = bodyText;
    }
  } catch (err) {
    // Ignore body parsing errors
  }
  
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  return {
    success: response.ok,
    endpoint,
    responseTime,
    totalTime,
    status: response.status,
    statusText: response.statusText,
    headers,
    body,
    bodyText,
    attempts: attempt
  };
}

/**
 * Format response time with color based on performance
 * @param {number} ms - Response time in milliseconds
 * @returns {string} - Formatted string with color
 */
function formatResponseTime(ms) {
  if (ms === null) return `${colors.red}N/A${colors.reset}`;
  
  const rounded = Math.round(ms);
  if (rounded < 300) {
    return `${colors.green}${rounded}ms${colors.reset}`;
  } else if (rounded < 1000) {
    return `${colors.yellow}${rounded}ms${colors.reset}`;
  } else {
    return `${colors.red}${(rounded / 1000).toFixed(2)}s${colors.reset}`;
  }
}

/**
 * Format HTTP status with color based on status code
 * @param {number} status - HTTP status code
 * @returns {string} - Formatted string with color
 */
function formatStatus(status) {
  if (status === null) return `${colors.red}N/A${colors.reset}`;
  
  if (status >= 200 && status < 300) {
    return `${colors.green}${status}${colors.reset}`;
  } else if (status >= 300 && status < 400) {
    return `${colors.cyan}${status}${colors.reset}`;
  } else if (status >= 400 && status < 500) {
    return `${colors.yellow}${status}${colors.reset}`;
  } else {
    return `${colors.red}${status}${colors.reset}`;
  }
}

/**
 * Print result of a request
 * @param {Object} result - Result from makeRequest
 * @param {string} description - Description of the test
 */
function printResult(result, description) {
  const statusText = result.success ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  const statusCode = formatStatus(result.status);
  const responseTime = formatResponseTime(result.responseTime);
  
  console.log(`\n${colors.bright}${description}${colors.reset}`);
  console.log(`Endpoint: ${colors.cyan}${result.endpoint}${colors.reset}`);
  console.log(`Status: ${statusText} (${statusCode} ${result.statusText || ''})`);
  console.log(`Response Time: ${responseTime}`);
  
  if (!result.success) {
    if (result.error) {
      console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
    }
    
    // Provide actionable diagnostics based on status code
    if (result.status === 401) {
      console.log(`${colors.yellow}Diagnosis: Authentication required. Check if demo mode is enabled.${colors.reset}`);
      console.log(`${colors.yellow}Action: Set ENABLE_DEMO_MODE=true in Vercel environment variables.${colors.reset}`);
    } else if (result.status === 404) {
      console.log(`${colors.yellow}Diagnosis: Endpoint not found. Check if the API route exists.${colors.reset}`);
    } else if (result.status === 500) {
      console.log(`${colors.yellow}Diagnosis: Server error. Check Vercel function logs.${colors.reset}`);
    } else if (result.status === 503) {
      console.log(`${colors.yellow}Diagnosis: Service unavailable. Deployment might be in progress.${colors.reset}`);
      console.log(`${colors.yellow}Action: Wait a few minutes and try again.${colors.reset}`);
    }
  }
  
  // Show server type and deployment info from headers
  if (result.headers) {
    const serverType = result.headers['server'] || result.headers['x-powered-by'] || 'Unknown';
    console.log(`Server: ${serverType}`);
    
    // Check for Vercel-specific headers
    const vercelHeaders = Object.keys(result.headers).filter(h => h.toLowerCase().includes('vercel'));
    if (vercelHeaders.length > 0 && verbose) {
      console.log(`${colors.dim}Vercel Headers:${colors.reset}`);
      vercelHeaders.forEach(h => {
        console.log(`${colors.dim}  ${h}: ${result.headers[h]}${colors.reset}`);
      });
    }
  }
  
  // Show detailed headers in verbose mode
  if (verbose && result.headers) {
    console.log(`\n${colors.dim}Headers:${colors.reset}`);
    Object.keys(result.headers).forEach(key => {
      console.log(`${colors.dim}  ${key}: ${result.headers[key]}${colors.reset}`);
    });
  }
  
  // Show response body preview in verbose mode
  if (verbose && result.body) {
    console.log(`\n${colors.dim}Response Body Preview:${colors.reset}`);
    if (typeof result.body === 'object') {
      try {
        const preview = JSON.stringify(result.body, null, 2).slice(0, 500);
        console.log(`${colors.dim}${preview}${preview.length >= 500 ? '...' : ''}${colors.reset}`);
      } catch {
        console.log(`${colors.dim}[Unable to stringify response body]${colors.reset}`);
      }
    } else if (typeof result.body === 'string') {
      const preview = result.body.slice(0, 500);
      console.log(`${colors.dim}${preview}${preview.length >= 500 ? '...' : ''}${colors.reset}`);
    }
  }
}

/**
 * Test the main page
 * @returns {Promise<Object>} - Test result
 */
async function testMainPage() {
  const result = await makeRequest('/');
  printResult(result, 'Main Page Test');
  return result;
}

/**
 * Test the rules API endpoint
 * @returns {Promise<Object>} - Test result
 */
async function testRulesEndpoint() {
  const result = await makeRequest('/api/rules');
  printResult(result, 'Rules API Test');
  
  // Check if rules are returned correctly
  if (result.success && Array.isArray(result.body)) {
    console.log(`${colors.green}✓ Rules API returned ${result.body.length} rules${colors.reset}`);
  }
  
  return result;
}

/**
 * Test the analyze API endpoint with demo text
 * @returns {Promise<Object>} - Test result
 */
async function testAnalyzeEndpoint() {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: 'This is a test message with passive voice. The message was written by me. Very nice text with some adverbs that are very redundant.',
    }),
  };
  
  const result = await makeRequest('/api/analyze', options);
  printResult(result, 'Analyze API Test');
  
  // Check if analysis results are returned correctly
  if (result.success && result.body && result.body.matches) {
    console.log(`${colors.green}✓ Analysis returned ${result.body.matches.length} matches${colors.reset}`);
    
    // Check for demo mode
    if (result.body.userId === 'demo-user') {
      console.log(`${colors.green}✓ Demo mode is working correctly${colors.reset}`);
    }
  }
  
  return result;
}

/**
 * Test the feedback API endpoint
 * @returns {Promise<Object>} - Test result
 */
async function testFeedbackEndpoint() {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      matchId: 'test-match-id',
      ruleId: 'passive-voice',
      isHelpful: true,
      comment: 'Test feedback from deployment checker',
    }),
  };
  
  const result = await makeRequest('/api/feedback', options);
  printResult(result, 'Feedback API Test');
  
  return result;
}

/**
 * Analyze overall deployment health and provide recommendations
 * @param {Object} results - Results from all tests
 */
function analyzeDeployment(results) {
  console.log(`\n${colors.bright}${colors.bgBlue} Deployment Health Analysis ${colors.reset}\n`);
  
  // Count successful tests
  const successCount = Object.values(results).filter(r => r.success).length;
  const totalTests = Object.keys(results).length;
  const successRate = Math.round((successCount / totalTests) * 100);
  
  // Overall health indicator
  let healthStatus;
  if (successRate === 100) {
    healthStatus = `${colors.bgGreen}${colors.bright} HEALTHY ${colors.reset}`;
  } else if (successRate >= 75) {
    healthStatus = `${colors.bgYellow}${colors.bright} PARTIAL ${colors.reset}`;
  } else {
    healthStatus = `${colors.bgRed}${colors.bright} CRITICAL ${colors.reset}`;
  }
  
  console.log(`Deployment Status: ${healthStatus} (${successCount}/${totalTests} tests passing, ${successRate}%)\n`);
  
  // Check for common issues
  const issues = [];
  
  // Check if main page is working but API endpoints aren't
  if (results.mainPage.success && !results.analyze.success) {
    issues.push({
      severity: 'high',
      message: 'API endpoints failing while main page works',
      diagnosis: 'Possible authentication/middleware issue or API route error',
      action: 'Check middleware.ts and API route handlers for authentication requirements',
    });
  }
  
  // Check for 401 errors (authentication issues)
  const authFailures = Object.values(results).filter(r => r.status === 401);
  if (authFailures.length > 0) {
    issues.push({
      severity: 'high',
      message: `Authentication required for ${authFailures.length} endpoints`,
      diagnosis: 'Demo mode may not be enabled or middleware is not respecting demo mode settings',
      action: 'Set ENABLE_DEMO_MODE=true and ALLOW_ANONYMOUS_ACCESS=true in Vercel environment variables',
    });
  }
  
  // Check for 404 errors (missing routes)
  const notFoundErrors = Object.values(results).filter(r => r.status === 404);
  if (notFoundErrors.length > 0) {
    issues.push({
      severity: 'medium',
      message: `${notFoundErrors.length} endpoints not found (404)`,
      diagnosis: 'API routes may not be deployed correctly',
      action: 'Check Vercel build logs for routing configuration issues',
    });
  }
  
  // Check for 500 errors (server errors)
  const serverErrors = Object.values(results).filter(r => r.status === 500);
  if (serverErrors.length > 0) {
    issues.push({
      severity: 'high',
      message: `${serverErrors.length} endpoints returning server errors (500)`,
      diagnosis: 'Runtime errors in API handlers',
      action: 'Check Vercel function logs for error details',
    });
  }
  
  // Check for slow responses
  const slowResponses = Object.values(results).filter(r => r.responseTime && r.responseTime > 1000);
  if (slowResponses.length > 0) {
    issues.push({
      severity: 'medium',
      message: `${slowResponses.length} endpoints with slow responses (>1s)`,
      diagnosis: 'Performance issues or cold starts',
      action: 'Consider optimizing API handlers or using Edge functions',
    });
  }
  
  // Print issues
  if (issues.length > 0) {
    console.log(`${colors.bright}Issues Detected:${colors.reset}\n`);
    
    issues.forEach((issue, i) => {
      const severityColor = issue.severity === 'high' ? colors.red : (issue.severity === 'medium' ? colors.yellow : colors.blue);
      console.log(`${severityColor}${i + 1}. ${issue.message}${colors.reset}`);
      console.log(`   ${colors.dim}Diagnosis:${colors.reset} ${issue.diagnosis}`);
      console.log(`   ${colors.dim}Action:${colors.reset} ${issue.action}\n`);
    });
  } else if (successRate === 100) {
    console.log(`${colors.green}✓ No issues detected. Deployment is healthy!${colors.reset}\n`);
  }
  
  // Recommendations
  console.log(`${colors.bright}Recommendations:${colors.reset}\n`);
  
  if (successRate < 100) {
    console.log(`1. Check Vercel deployment logs for build or runtime errors`);
    console.log(`2. Verify environment variables are set correctly (ENABLE_DEMO_MODE=true)`);
    console.log(`3. Test the API endpoints manually with curl or Postman`);
    
    if (authFailures.length > 0) {
      console.log(`4. Review middleware.ts and authentication logic`);
    }
  } else {
    console.log(`1. Consider setting up monitoring for ongoing health checks`);
    console.log(`2. Add more comprehensive E2E tests for critical user flows`);
    console.log(`3. Review performance metrics for optimization opportunities`);
  }
}

/**
 * Main function to run all tests
 */
async function runTests() {
  console.log(`\n${colors.bright}${colors.bgBlue} Public Deployment Status Checker ${colors.reset}`);
  console.log(`\nTesting deployment: ${colors.cyan}${url}${colors.reset}`);
  console.log(`Timeout: ${timeout}ms, Retries: ${retries}, Verbose: ${verbose ? 'Yes' : 'No'}`);
  console.log(`${colors.dim}Started at: ${new Date().toISOString()}${colors.reset}`);
  console.log(`\n${colors.bright}Running tests...${colors.reset}`);
  
  const results = {
    mainPage: await testMainPage(),
    rules: await testRulesEndpoint(),
    analyze: await testAnalyzeEndpoint(),
    feedback: await testFeedbackEndpoint(),
  };
  
  analyzeDeployment(results);
  
  console.log(`\n${colors.dim}Finished at: ${new Date().toISOString()}${colors.reset}`);
}

// Run the tests
runTests().catch(error => {
  console.error(`\n${colors.red}Error running tests:${colors.reset}`, error);
  process.exit(1);
});
