import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
if (fs.existsSync(".env")) {
  dotenv.config();
}

const DATABASE_URL = process.env.DATABASE_URL;

console.log("🚀 Database Setup Script");
console.log("========================");

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found in environment variables");
  console.error("Please set DATABASE_URL in your .env file");
  console.error("See DATABASE_SETUP.md for instructions");
  process.exit(1);
}

if (DATABASE_URL.includes("[PROJECT_ID]") || DATABASE_URL.includes("[PASSWORD]") || DATABASE_URL.includes("[REGION]")) {
  console.error("❌ ERROR: DATABASE_URL contains placeholder values");
  console.error("Please replace placeholders with actual values");
  console.error("See DATABASE_SETUP.md for instructions");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  connect_timeout: 10,
  max: 1,
  prepare: false,
});

try {
  console.log("🔗 Connecting to database...");
  
  // Test connection
  await sql`SELECT 1`;
  console.log("✅ Connected successfully!");
  
  // Read and execute schema
  const schemaPath = path.join(process.cwd(), "database", "schema.sql");
  
  if (!fs.existsSync(schemaPath)) {
    console.error("❌ Schema file not found:", schemaPath);
    process.exit(1);
  }
  
  console.log("📋 Reading database schema...");
  const schemaSQL = fs.readFileSync(schemaPath, "utf-8");
  
  console.log("🏗️  Creating database schema...");
  
  // Execute the schema (split by semicolons and execute each statement)
  const statements = schemaSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement) {
      try {
        await sql.unsafe(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Statement ${i + 1}/${statements.length} - object already exists (skipped)`);
        } else {
          console.error(`❌ Error in statement ${i + 1}: ${error.message}`);
          console.error("Statement:", statement.substring(0, 100) + "...");
        }
      }
    }
  }
  
  console.log("\n🎯 Schema setup complete!");
  
  // Verify tables were created
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  
  console.log(`📊 Created ${tables.length} tables:`, tables.map(t => t.table_name).join(", "));
  
  // Run migrations if they exist
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  if (fs.existsSync(migrationsDir)) {
    console.log("\n🔄 Running migrations...");
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const migrationFile of migrationFiles) {
      console.log(`📄 Running migration: ${migrationFile}`);
      const migrationSQL = fs.readFileSync(path.join(migrationsDir, migrationFile), "utf-8");
      
      try {
        await sql.unsafe(migrationSQL);
        console.log(`✅ Migration ${migrationFile} completed`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`ℹ️  Migration ${migrationFile} - changes already applied (skipped)`);
        } else {
          console.error(`❌ Migration ${migrationFile} failed:`, error.message);
        }
      }
    }
  }
  
  console.log("\n🎉 Database setup completed successfully!");
  console.log("You can now run: npm run dev");
  
} catch (error) {
  console.error("❌ SETUP FAILED:", error.message);
  process.exit(1);
} finally {
  await sql.end();
}