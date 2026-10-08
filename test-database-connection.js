import { sql } from "./src/lib/db.ts";

async function testConnection() {
  if (!sql) {
    console.log(
      "Database connection is running in MOCK MODE (no DATABASE_URL configured or invalid).",
    );
    process.exit(0);
  }

  try {
    const result = await sql`SELECT NOW()`;
    console.log("Database connection successful:", result[0]);
    process.exit(0);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

testConnection();
