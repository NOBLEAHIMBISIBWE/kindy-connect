import postgres from "postgres";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
if (fs.existsSync(".env")) {
  dotenv.config();
}

const DATABASE_URL = process.env.DATABASE_URL;

console.log("🔍 Testing Database Connection...");
console.log("=====================================");

if (!DATABASE_URL) {
  console.log("ℹ️  DATABASE_URL not found in environment variables");
  console.log("📝 Application is running in MOCK MODE with sample data");
  console.log("✅ This is perfectly fine for development and testing!");
  console.log("");
  console.log("💡 To use a real database:");
  console.log("   1. Set DATABASE_URL in your .env file");
  console.log("   2. See DATABASE_SETUP.md for complete instructions");
  console.log("");
  console.log("🚀 Current mode: MOCK MODE (sample data)");
  process.exit(0);
}

if (
  DATABASE_URL.includes("[PROJECT_ID]") ||
  DATABASE_URL.includes("[PASSWORD]") ||
  DATABASE_URL.includes("[REGION]") ||
  DATABASE_URL.includes("localhost:5432") ||
  DATABASE_URL.includes("placeholder")
) {
  console.log("⚠️  DATABASE_URL contains placeholder values");
  console.log("Current DATABASE_URL:", DATABASE_URL.substring(0, 50) + "...");
  console.log("");
  console.log("📝 Application is running in MOCK MODE with sample data");
  console.log("✅ This is perfectly fine for development and testing!");
  console.log("");
  console.log("💡 To switch to database mode:");
  console.log("   1. Replace placeholder values with real Supabase credentials");
  console.log("   2. See DATABASE_SETUP.md for step-by-step instructions");
  console.log("");
  console.log("🚀 Current mode: MOCK MODE (sample data)");
  process.exit(0);
}

console.log("🔐 Database URL format appears valid");
console.log("🔗 Attempting connection...");

const sql = postgres(DATABASE_URL, {
  connect_timeout: 10,
  max: 1,
  prepare: false, // Required for Supabase pooler
});

try {
  // Test basic connection
  const result = await sql`SELECT 
    1 as test,
    current_database() as database_name,
    current_user as user_name,
    version() as postgresql_version`;

  console.log("✅ SUCCESS: Database connection established!");
  console.log("📊 Connection Details:");
  console.log(`   Database: ${result[0].database_name}`);
  console.log(`   User: ${result[0].user_name}`);
  console.log(
    `   PostgreSQL: ${result[0].postgresql_version.split(" ")[0]} ${result[0].postgresql_version.split(" ")[1]}`,
  );

  // Check if tables exist
  console.log("\n🏗️  Checking database schema...");

  const expectedTables = [
    "schools",
    "users",
    "classes",
    "subjects",
    "pupils",
    "parents",
    "pupil_parents",
    "attendance",
    "notifications",
    "audit_logs",
    "marks",
    "fees",
  ];

  const existingTables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = ANY(${expectedTables})
    ORDER BY table_name
  `;

  const existingTableNames = existingTables.map((t) => t.table_name);
  const missingTables = expectedTables.filter((t) => !existingTableNames.includes(t));

  console.log(`📋 Tables found: ${existingTableNames.length}/${expectedTables.length}`);

  if (existingTableNames.length > 0) {
    console.log("✅ Existing tables:", existingTableNames.join(", "));
  }

  if (missingTables.length > 0) {
    console.log("⚠️  Missing tables:", missingTables.join(", "));
    console.log("💡 Run the database schema to create missing tables:");
    console.log('   psql "$DATABASE_URL" -f database/schema.sql');
  } else {
    console.log("🎉 All required tables are present!");

    // Test a sample query
    const schoolCount = await sql`SELECT COUNT(*) as count FROM schools`;
    console.log(`📚 Schools in database: ${schoolCount[0].count}`);
  }

  console.log("\n🎯 Database is ready for use!");
} catch (error) {
  console.error("❌ DATABASE CONNECTION FAILED:");
  console.error("Error:", error.message);

  if (error.message.includes("ENOTFOUND")) {
    console.error("\n💡 Troubleshooting:");
    console.error("• Check if the database URL host is correct");
    console.error("• Verify your Supabase project is still active");
    console.error("• Make sure you have internet connectivity");
  } else if (error.message.includes("authentication")) {
    console.error("\n💡 Troubleshooting:");
    console.error("• Check if the password in DATABASE_URL is correct");
    console.error("• Verify the project ID matches your Supabase project");
  } else {
    console.error("\n💡 Check DATABASE_SETUP.md for complete setup instructions");
  }

  process.exit(1);
} finally {
  await sql.end();
}
