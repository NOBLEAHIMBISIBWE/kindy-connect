#!/usr/bin/env node
/**
 * Database Mode Switcher for Kindy Connect
 * 
 * Helps users easily switch between mock mode and database mode
 */

import fs from "fs";
import path from "path";
import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log("🎛️  Kindy Connect - Database Mode Switcher");
console.log("==========================================");

async function getCurrentMode() {
  const envPath = ".env";
  if (!fs.existsSync(envPath)) {
    return "mock";
  }
  
  const envContent = fs.readFileSync(envPath, "utf-8");
  const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
  
  if (!dbUrlMatch) {
    return "mock";
  }
  
  const dbUrl = dbUrlMatch[1].trim();
  if (dbUrl.includes("placeholder") || dbUrl.includes("[") || dbUrl.includes("localhost:5432")) {
    return "mock";
  }
  
  return "database";
}

async function showCurrentStatus() {
  const mode = await getCurrentMode();
  
  console.log("\n📊 Current Status:");
  console.log("==================");
  
  if (mode === "mock") {
    console.log("🎯 Mode: MOCK MODE (Sample Data)");
    console.log("✅ Features: All features work with sample data");
    console.log("⚠️  Persistence: Data doesn't persist between restarts");
    console.log("💡 Perfect for: Development, testing, learning");
  } else {
    console.log("🎯 Mode: DATABASE MODE (Persistent Storage)");
    console.log("✅ Features: All features work with real database");
    console.log("✅ Persistence: Data persists permanently");
    console.log("💡 Perfect for: Production, real school use");
  }
  
  return mode;
}

async function switchToMockMode() {
  console.log("\n🔄 Switching to Mock Mode...");
  
  const envPath = ".env";
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }
  
  // Comment out DATABASE_URL if it exists
  envContent = envContent.replace(/^DATABASE_URL=(.*)$/m, "# DATABASE_URL=$1");
  
  // Add explanation comment if not present
  if (!envContent.includes("MOCK MODE")) {
    envContent += `

# Database Configuration
# MOCK MODE: Comment out DATABASE_URL to use mock data for development
# Uncomment and set a real URL when you have a database
# DATABASE_URL=postgresql://localhost:5432/kindy_connect_dev
`;
  }
  
  fs.writeFileSync(envPath, envContent);
  
  console.log("✅ Switched to Mock Mode!");
  console.log("📝 DATABASE_URL has been commented out in .env");
  console.log("🔄 Please restart your development server: npm run dev");
}

async function switchToDatabaseMode() {
  console.log("\n🔄 Switching to Database Mode...");
  console.log("You'll need a Supabase database URL.");
  console.log("📖 See README.md for detailed setup instructions.");
  
  const hasUrl = await question("\nDo you already have a Supabase database URL? (y/N): ");
  
  if (hasUrl.toLowerCase().startsWith('y')) {
    const dbUrl = await question("Enter your DATABASE_URL: ");
    
    if (!dbUrl.trim()) {
      console.log("❌ No URL provided. Operation cancelled.");
      return;
    }
    
    const envPath = ".env";
    let envContent = "";
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }
    
    // Update or add DATABASE_URL
    if (envContent.includes("DATABASE_URL=")) {
      envContent = envContent.replace(/^#?\s*DATABASE_URL=(.*)$/m, `DATABASE_URL=${dbUrl.trim()}`);
    } else {
      envContent += `\nDATABASE_URL=${dbUrl.trim()}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    
    console.log("✅ Database URL saved!");
    console.log("🔧 Next steps:");
    console.log("   1. Run: npm run db:test");
    console.log("   2. Run: npm run db:setup");
    console.log("   3. Restart server: npm run dev");
  } else {
    console.log("\n📖 To set up a Supabase database:");
    console.log("   1. Go to https://supabase.com");
    console.log("   2. Create a new project");
    console.log("   3. Get your connection string");
    console.log("   4. Run this script again");
    console.log("");
    console.log("📋 See README.md for detailed instructions");
  }
}

async function main() {
  try {
    const currentMode = await showCurrentStatus();
    
    console.log("\n🎛️  What would you like to do?");
    console.log("1. Keep current mode (no changes)");
    
    if (currentMode === "mock") {
      console.log("2. Switch to Database Mode (persistent storage)");
    } else {
      console.log("2. Switch to Mock Mode (sample data)");
    }
    
    console.log("3. View setup guidance in README.md");
    console.log("4. Test current database connection");
    
    const choice = await question("\nEnter your choice (1-4): ");
    
    switch (choice.trim()) {
      case "1":
        console.log("✅ No changes made. Current mode maintained.");
        break;
        
      case "2":
        if (currentMode === "mock") {
          await switchToDatabaseMode();
        } else {
          await switchToMockMode();
        }
        break;
        
      case "3":
        console.log("\n📖 Please check README.md for detailed database instructions.");
        break;
        
      case "4":
        console.log("\n🔍 Testing database connection...");
        console.log("Run: npm run db:test");
        break;
        
      default:
        console.log("❌ Invalid choice. No changes made.");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    rl.close();
  }
}

main();