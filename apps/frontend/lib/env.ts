import { parse as parseUrl } from 'url';

/**
 * Environment variable validation and configuration module.
 * Provides type-safe access to validated environment variables.
 */

// Define types for environment variables
export type Environment = 'development' | 'production' | 'test';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface EnvConfig {
  // Database Configuration
  postgres: {
    url: string;
    poolMax: number;
    idleTimeout: number;
  };
  
  // Cache/Queue Configuration
  redis: {
    url: string;
    password?: string;
    db: number;
    analysisCacheTtl: number;
  };
  
  // AI/LLM Provider Settings
  ai: {
    openaiApiKey?: string;
    provider: string;
    model: string;
    concurrency: number;
    timeoutMs: number;
    temperature: number;
  };
  
  // JWT Authentication Settings
  jwt: {
    publicKey?: string;
    jwksUrl?: string;
    issuer?: string;
    audience?: string;
    expiration: number;
  };
  
  // Application Settings
  app: {
    port: number;
    host: string;
    apiBaseUrl: string;
    wsUrl: string;
    enableWebsocket: boolean;
  };
  
  // Environment Settings
  env: {
    nodeEnv: Environment;
    debug: boolean;
    logLevel: LogLevel;
    showDetailedErrors: boolean;
  };
  
  // Rate Limiting & Security Settings
  security: {
    rateLimit: {
      max: number;
      windowMs: number;
    };
    text: {
      maxLength: number;
      minLength: number;
    };
    corsOrigins: string[];
  };
  
  // Monitoring & Observability
  monitoring: {
    enableMetrics: boolean;
    metricsPath: string;
    enableHealthCheck: boolean;
    healthCheckPath: string;
  };

  // Demo & Development Settings
  demo: {
    enableDemoMode: boolean;
    allowAnonymousAccess: boolean;
  };
}

// Validation functions
function validateRequiredEnv(name: string, value?: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function validateNumber(name: string, value: string, defaultValue?: number): number {
  const num = Number(value);
  if (isNaN(num)) {
    if (defaultValue !== undefined) {
      console.warn(`Invalid number for ${name}, using default: ${defaultValue}`);
      return defaultValue;
    }
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return num;
}

function validateBoolean(name: string, value: string, defaultValue: boolean): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  console.warn(`Invalid boolean for ${name}, using default: ${defaultValue}`);
  return defaultValue;
}

function validateUrl(name: string, value: string): string {
  try {
    const url = parseUrl(value);
    if (!url.protocol || !url.host) {
      throw new Error(`Environment variable ${name} must be a valid URL`);
    }
    return value;
  } catch (error) {
    throw new Error(`Environment variable ${name} must be a valid URL: ${error.message}`);
  }
}

function validateEnum<T extends string>(name: string, value: string, validValues: T[], defaultValue: T): T {
  if (validValues.includes(value as T)) {
    return value as T;
  }
  console.warn(`Invalid value for ${name}, using default: ${defaultValue}`);
  return defaultValue;
}

function parseCommaSeparatedList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

// Load and validate environment variables
function loadEnvConfig(): EnvConfig {
  // Determine environment
  const nodeEnv = validateEnum<Environment>(
    'NODE_ENV',
    process.env.NODE_ENV || 'development',
    ['development', 'production', 'test'],
    'development'
  );
  
  const isDev = nodeEnv === 'development';
  const isTest = nodeEnv === 'test';
  const isProd = nodeEnv === 'production';
  
  // In test environment, we don't need to validate all variables
  const skipValidationInTest = isTest;
  
  // Database Configuration
  const postgresUrl = skipValidationInTest
    ? 'postgresql://postgres:password@localhost:5432/test_db'
    : validateRequiredEnv('POSTGRES_URL', process.env.POSTGRES_URL);
  
  // AI Provider - only required in production
  let openaiApiKey: string | undefined;
  if (isProd) {
    openaiApiKey = validateRequiredEnv('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
  } else {
    openaiApiKey = process.env.OPENAI_API_KEY;
  }
  
  // JWT settings - only required in production
  let jwtPublicKey: string | undefined;
  let jwtJwksUrl: string | undefined;
  let jwtIssuer: string | undefined;
  
  if (isProd) {
    // In production, we need at least one JWT validation method
    if (!process.env.JWT_PUBLIC_KEY && !process.env.JWT_JWKS_URL) {
      throw new Error('In production, either JWT_PUBLIC_KEY or JWT_JWKS_URL must be provided');
    }
    
    jwtPublicKey = process.env.JWT_PUBLIC_KEY;
    jwtJwksUrl = process.env.JWT_JWKS_URL ? validateUrl('JWT_JWKS_URL', process.env.JWT_JWKS_URL) : undefined;
    jwtIssuer = validateRequiredEnv('JWT_ISSUER', process.env.JWT_ISSUER);
  } else {
    jwtPublicKey = process.env.JWT_PUBLIC_KEY;
    jwtJwksUrl = process.env.JWT_JWKS_URL;
    jwtIssuer = process.env.JWT_ISSUER;
  }
  
  // Build the config object
  return {
    postgres: {
      url: postgresUrl,
      poolMax: validateNumber('POSTGRES_POOL_MAX', process.env.POSTGRES_POOL_MAX || '10', 10),
      idleTimeout: validateNumber('POSTGRES_IDLE_TIMEOUT', process.env.POSTGRES_IDLE_TIMEOUT || '30000', 30000),
    },
    
    redis: {
      url: validateOptionalEnv('REDIS_URL', 'redis://localhost:6379'),
      password: process.env.REDIS_PASSWORD,
      db: validateNumber('REDIS_DB', process.env.REDIS_DB || '0', 0),
      analysisCacheTtl: validateNumber('ANALYSIS_CACHE_TTL', process.env.ANALYSIS_CACHE_TTL || '900', 900),
    },
    
    ai: {
      openaiApiKey,
      provider: validateOptionalEnv('LLM_PROVIDER', 'openai'),
      model: validateOptionalEnv('LLM_MODEL', 'gpt-4o'),
      concurrency: validateNumber('AI_RULES_CONCURRENCY', process.env.AI_RULES_CONCURRENCY || '2', 2),
      timeoutMs: validateNumber('AI_RULE_TIMEOUT_MS', process.env.AI_RULE_TIMEOUT_MS || '30000', 30000),
      temperature: validateNumber('AI_TEMPERATURE', process.env.AI_TEMPERATURE || '0.2', 0.2),
    },
    
    jwt: {
      publicKey: jwtPublicKey,
      jwksUrl: jwtJwksUrl,
      issuer: jwtIssuer,
      audience: process.env.JWT_AUDIENCE,
      expiration: validateNumber('JWT_EXPIRATION', process.env.JWT_EXPIRATION || '3600', 3600),
    },
    
    app: {
      port: validateNumber('PORT', process.env.PORT || '3000', 3000),
      host: validateOptionalEnv('HOST', 'localhost'),
      apiBaseUrl: validateOptionalEnv('API_BASE_URL', 'http://localhost:3000/api'),
      wsUrl: validateOptionalEnv('WS_URL', 'ws://localhost:3000/api/websocket'),
      enableWebsocket: validateBoolean('ENABLE_WEBSOCKET', process.env.ENABLE_WEBSOCKET || 'true', true),
    },
    
    env: {
      nodeEnv,
      debug: validateBoolean('DEBUG', process.env.DEBUG || 'false', false),
      logLevel: validateEnum<LogLevel>(
        'LOG_LEVEL',
        process.env.LOG_LEVEL || 'info',
        ['error', 'warn', 'info', 'debug'],
        'info'
      ),
      showDetailedErrors: validateBoolean('SHOW_DETAILED_ERRORS', process.env.SHOW_DETAILED_ERRORS || 'false', false),
    },
    
    security: {
      rateLimit: {
        max: validateNumber('RATE_LIMIT_MAX', process.env.RATE_LIMIT_MAX || '100', 100),
        windowMs: validateNumber('RATE_LIMIT_WINDOW_MS', process.env.RATE_LIMIT_WINDOW_MS || '60000', 60000),
      },
      text: {
        maxLength: validateNumber('MAX_TEXT_LENGTH', process.env.MAX_TEXT_LENGTH || '50000', 50000),
        minLength: validateNumber('MIN_TEXT_LENGTH', process.env.MIN_TEXT_LENGTH || '10', 10),
      },
      corsOrigins: process.env.CORS_ORIGINS
        ? parseCommaSeparatedList(process.env.CORS_ORIGINS)
        : ['http://localhost:3000'],
    },
    
    // Demo & Development Settings
    demo: {
      enableDemoMode: validateBoolean(
        'ENABLE_DEMO_MODE',
        process.env.ENABLE_DEMO_MODE || 'false',
        false,
      ),
      allowAnonymousAccess: validateBoolean(
        'ALLOW_ANONYMOUS_ACCESS',
        process.env.ALLOW_ANONYMOUS_ACCESS || 'false',
        false,
      ),
    },
    
    monitoring: {
      enableMetrics: validateBoolean('ENABLE_METRICS', process.env.ENABLE_METRICS || 'true', true),
      metricsPath: validateOptionalEnv('METRICS_PATH', '/metrics'),
      enableHealthCheck: validateBoolean('ENABLE_HEALTH_CHECK', process.env.ENABLE_HEALTH_CHECK || 'true', true),
      healthCheckPath: validateOptionalEnv('HEALTH_CHECK_PATH', '/health'),
    },
  };
}

// Load configuration once at startup
let config: EnvConfig;

try {
  config = loadEnvConfig();
  console.log(`Environment configuration loaded for ${config.env.nodeEnv} environment`);
} catch (error) {
  console.error('Failed to load environment configuration:', error.message);
  process.exit(1);
}

// Export the config object
export default config;
