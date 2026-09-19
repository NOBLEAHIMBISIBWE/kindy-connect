// Ensure process.env.DATABASE_URL is populated in local development
if (typeof window === "undefined" && typeof process !== "undefined" && !process.env.DATABASE_URL) {
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(".env");
    } catch {}
  }
  if (!process.env.DATABASE_URL) {
    try {
      const path = require("node:path");
      const fs = require("node:fs");
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        const match = envContent.match(/^DATABASE_URL=(.+)$/m);
        if (match) {
          process.env.DATABASE_URL = match[1].trim();
        }
      }
    } catch {}
  }
}

const connectionString = typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;

// Development mode check - if we can't connect to the database, we'll use mock data
const isDevelopmentMode =
  !connectionString ||
  connectionString.includes("localhost") ||
  connectionString.includes("placeholder") ||
  connectionString.includes("[PROJECT_ID]");

if (!connectionString && typeof process !== "undefined") {
  console.warn(
    "⚠️  WARNING: DATABASE_URL is not defined. Running in mock data mode for development.\n" +
      "To use a real database, set DATABASE_URL in your .env file.",
  );
}

const globalForDb = globalThis as unknown as {
  __postgres_sql__?: any;
};

const defaultMaxPool =
  typeof process !== "undefined" && process.env.DB_POOL_MAX
    ? parseInt(process.env.DB_POOL_MAX, 10)
    : typeof process !== "undefined" &&
        (process.env.VERCEL === "1" || process.env.NODE_ENV === "production")
      ? 3
      : 5;

function getPostgresClient() {
  if (typeof window !== "undefined") {
    return null;
  }

  if (!connectionString || isDevelopmentMode) {
    return null;
  }

  if (globalForDb.__postgres_sql__) {
    return globalForDb.__postgres_sql__;
  }

  const postgres = require("postgres");

  const client = postgres(connectionString, {
    // Keep max connections per process small (default 3 in production/serverless)
    // so multiple concurrent serverless instances do not exceed PgBouncer's 15 client limit
    max: defaultMaxPool,
    // Close idle connections quickly (10s) to free up PgBouncer connection slots
    idle_timeout: 10,
    // Allow 30 seconds for connection — Supabase free tier can take up to 20s to wake
    connect_timeout: 30,
    // Recycle connections every 10 minutes
    max_lifetime: 60 * 10,
    // REQUIRED for Supabase PgBouncer in transaction mode (default pooler)
    // Without this, prepared statements fail on pooled connections
    prepare: false,
    ssl:
      typeof process !== "undefined" &&
      (process.env.NODE_ENV === "production" || process.env.VERCEL === "1")
        ? { rejectUnauthorized: false }
        : false,
    // Suppress notices
    onnotice: () => {},
  });

  globalForDb.__postgres_sql__ = client;
  return client;
}

export const sql = getPostgresClient();

/**
 * Deeply converts an object's keys from snake_case to camelCase
 */
export function toCamel<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamel(v)) as any;
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
      result[camelKey] = toCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

/**
 * Deeply converts an object's keys from camelCase to snake_case
 */
export function toSnake<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => toSnake(v)) as any;
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

/**
 * Set Row Level Security (RLS) context for multi-tenant queries
 * Sets PostgreSQL session variables used by RLS policies
 * @param sql - PostgreSQL client instance
 * @param userId - ID of the authenticated user
 */
export async function setRLSContext(sql: any, userId: string) {
  // Query user to get role and school_id
  const users = await sql`SELECT role, school_id FROM users WHERE id = ${userId}`;

  if (users.length === 0) {
    throw new Error("Unauthorized: User not found");
  }

  const user = users[0];

  // Set user_id for all users using set_config (supports parameterized inputs)
  await sql`SELECT set_config('app.user_id', ${userId}, true)`;

  // Set school_id only for school-scoped users (not super_admin)
  if (user.role !== "super_admin" && user.school_id) {
    await sql`SELECT set_config('app.school_id', ${user.school_id}, true)`;
  }

  return { role: user.role, schoolId: user.school_id };
}
