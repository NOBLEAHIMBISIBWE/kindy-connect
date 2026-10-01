import postgres from "postgres";
import fs from "fs";

// Load .env
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  const match = envContent.match(/^DATABASE_URL=(.+)$/m);
  if (match) {
    dbUrl = match[1].trim();
  }
}

if (!dbUrl) {
  console.error("No DATABASE_URL found in process.env or .env");
  process.exit(1);
}

const sql = postgres(dbUrl, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
});

const FIRST_NAMES_M = [
  "Ethan",
  "Noah",
  "Liam",
  "Lucas",
  "Oliver",
  "Mason",
  "Elijah",
  "Logan",
  "Aiden",
  "James",
  "Benjamin",
  "Jacob",
  "Jackson",
  "Daniel",
  "Henry",
  "Samuel",
  "David",
  "Joseph",
  "Wyatt",
  "Gabriel",
  "Julian",
  "Carter",
  "Kevin",
  "Brian",
  "Victor",
  "Ian",
  "Felix",
  "Oscar",
  "Marcus",
  "Trevor",
];

const FIRST_NAMES_F = [
  "Emma",
  "Olivia",
  "Ava",
  "Sophia",
  "Isabella",
  "Mia",
  "Charlotte",
  "Amelia",
  "Harper",
  "Evelyn",
  "Abigail",
  "Emily",
  "Ella",
  "Elizabeth",
  "Camila",
  "Luna",
  "Sofia",
  "Avery",
  "Mila",
  "Aria",
  "Scarlett",
  "Grace",
  "Chloe",
  "Victoria",
  "Riley",
  "Penelope",
  "Layla",
  "Zoey",
  "Nora",
  "Lily",
];

const LAST_NAMES = [
  "Kipkorir",
  "Mwangi",
  "Otieno",
  "Wanjiku",
  "Ochieng",
  "Mutua",
  "Wambui",
  "Kipchoge",
  "Auma",
  "Njeri",
  "Wangari",
  "Njenga",
  "Atieno",
  "Kamau",
  "Odhiambo",
  "Maina",
  "Njuguna",
  "Kiprop",
  "Omondi",
  "Chebet",
  "Karanja",
  "Kipchirchir",
  "Wekesa",
  "Simiyu",
  "Nyangweso",
  "Cherono",
  "Rotich",
];

const PARENT_RELATIONS = ["Mother", "Father", "Guardian"];

async function run() {
  try {
    console.log("Connecting to database...");

    // 1. Fetch all classes
    const classes = await sql`SELECT id, name, school_id FROM classes ORDER BY school_id, id`;
    console.log(`Found ${classes.length} classes:`);
    for (const c of classes) {
      console.log(` - [${c.id}] ${c.name} (School: ${c.school_id})`);
    }

    if (classes.length === 0) {
      console.log("No classes found in the database!");
      process.exit(0);
    }

    // 2. Fetch maximum student admission number or existing students to avoid duplicate IDs/admission numbers
    const existingStudents = await sql`SELECT id, admission_no FROM students`;
    const existingIds = new Set(existingStudents.map((p) => p.id));
    const existingAdmNos = new Set(existingStudents.map((p) => p.admission_no));

    console.log(`Existing students count: ${existingStudents.length}`);

    let totalStudentsAdded = 0;
    let totalParentsAdded = 0;

    let counter = 100;

    for (const cls of classes) {
      console.log(`\nProcessing Class [${cls.id}] ${cls.name}...`);

      for (let i = 1; i <= 5; i++) {
        counter++;
        let studentId = `p_auto_${cls.id}_${i}_${counter}`;
        let admNo = `ADM-${cls.id.toUpperCase()}-${counter}`;

        while (existingIds.has(studentId)) {
          counter++;
          studentId = `p_auto_${cls.id}_${i}_${counter}`;
        }
        while (existingAdmNos.has(admNo)) {
          counter++;
          admNo = `ADM-${cls.id.toUpperCase()}-${counter}`;
        }

        existingIds.add(studentId);
        existingAdmNos.add(admNo);

        const isMale = Math.random() > 0.5;
        const gender = isMale ? "M" : "F";
        const firstName = isMale
          ? FIRST_NAMES_M[Math.floor(Math.random() * FIRST_NAMES_M.length)]
          : FIRST_NAMES_F[Math.floor(Math.random() * FIRST_NAMES_F.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

        // Random DOB between 2019 and 2021
        const year = 2019 + Math.floor(Math.random() * 3);
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
        const dob = `${year}-${month}-${day}`;

        // Insert student
        await sql`
          INSERT INTO students (id, admission_no, first_name, last_name, gender, dob, class_id, active, school_id)
          VALUES (${studentId}, ${admNo}, ${firstName}, ${lastName}, ${gender}, ${dob}, ${cls.id}, TRUE, ${cls.school_id})
          ON CONFLICT (id) DO NOTHING
        `;
        totalStudentsAdded++;

        // Create Parent
        const parentId = `parent_${studentId}`;
        const parentRelation =
          PARENT_RELATIONS[Math.floor(Math.random() * PARENT_RELATIONS.length)];
        const parentName = `${parentRelation === "Mother" ? "Mary" : parentRelation === "Father" ? "John" : "Grace"} ${lastName}`;
        const phone = `+2547${Math.floor(10000000 + Math.random() * 90000000)}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${counter}@parent.kindy.app`;

        await sql`
          INSERT INTO parents (id, name, phone, email, relationship, school_id)
          VALUES (${parentId}, ${parentName}, ${phone}, ${email}, ${parentRelation}, ${cls.school_id})
          ON CONFLICT (id) DO NOTHING
        `;
        totalParentsAdded++;

        // Link Student & Parent
        await sql`
          INSERT INTO student_parents (student_id, parent_id)
          VALUES (${studentId}, ${parentId})
          ON CONFLICT (student_id, parent_id) DO NOTHING
        `;

        console.log(
          `   + Added Student: ${firstName} ${lastName} (${admNo}) [ID: ${studentId}] with Parent: ${parentName}`,
        );
      }
    }

    console.log(
      `\nSuccessfully added ${totalStudentsAdded} students and ${totalParentsAdded} parents across ${classes.length} classes!`,
    );
    process.exit(0);
  } catch (err) {
    console.error("Error executing script:", err);
    process.exit(1);
  }
}

run();
