import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/^DATABASE_URL=(.+)$/m);
      if (match) {
        process.env.DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch (err) {
    console.error("Error reading .env:", err);
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("No DATABASE_URL found!");
  process.exit(1);
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function main() {
  try {
    console.log("Connecting to database and executing clear mock data...");
    await sql.begin(async (sql) => {
      await sql`TRUNCATE TABLE marks CASCADE`;
      await sql`TRUNCATE TABLE attendance CASCADE`;
      await sql`TRUNCATE TABLE notifications CASCADE`;
      await sql`TRUNCATE TABLE audit_logs CASCADE`;
      await sql`TRUNCATE TABLE student_parents CASCADE`;
      await sql`TRUNCATE TABLE students CASCADE`;
      await sql`TRUNCATE TABLE parents CASCADE`;
      await sql`DELETE FROM classes`;
      await sql`DELETE FROM users WHERE role != 'super_admin'`;
      await sql`DELETE FROM schools`;
    });
    console.log("Database mock data cleared successfully!");

    // Check remaining row counts
    const schoolsCount = await sql`SELECT COUNT(*) FROM schools`;
    const usersCount = await sql`SELECT COUNT(*) FROM users`;
    const studentsCount = await sql`SELECT COUNT(*) FROM students`;
    const parentsCount = await sql`SELECT COUNT(*) FROM parents`;
    const classesCount = await sql`SELECT COUNT(*) FROM classes`;
    const marksCount = await sql`SELECT COUNT(*) FROM marks`;
    const attendanceCount = await sql`SELECT COUNT(*) FROM attendance`;

    console.log("Remaining counts:");
    console.log(`- Schools: ${schoolsCount[0].count}`);
    console.log(`- Users: ${usersCount[0].count}`);
    console.log(`- Students: ${studentsCount[0].count}`);
    console.log(`- Parents: ${parentsCount[0].count}`);
    console.log(`- Classes: ${classesCount[0].count}`);
    console.log(`- Marks: ${marksCount[0].count}`);
    console.log(`- Attendance: ${attendanceCount[0].count}`);
  } catch (err) {
    console.error("Error clearing database:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
