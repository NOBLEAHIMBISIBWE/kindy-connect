/**
 * CSV Utilities for Bulk Upload
 * Handles CSV parsing, validation, and template generation
 */

import { z } from "zod";

// Validation schema for student CSV data
export const studentCSVSchema = z.object({
  admissionNo: z.string().min(1, "Admission number is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(["M", "F"], { errorMap: () => ({ message: "Gender must be M or F" }) }),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  className: z.string().min(1, "Class name is required"),
  parentName: z.string().min(1, "Parent name is required"),
  parentPhone: z.string().min(1, "Parent phone is required"),
  parentEmail: z.string().email("Invalid email format"),
  parentRelationship: z.string().min(1, "Parent relationship is required"),
});

export type StudentCSVRow = z.infer<typeof studentCSVSchema>;

export interface ParseResult {
  success: boolean;
  data: StudentCSVRow[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
}

function calculateAge(dobString: string): number {
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 0;
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

/**
 * Generate CSV template with headers and sample data
 */
export const EXPECTED_HEADERS = [
  "admissionNo",
  "firstName",
  "lastName",
  "gender",
  "dob",
  "className",
  "parentName",
  "parentPhone",
  "parentEmail",
  "parentRelationship",
] as const;

export type ExpectedHeader = (typeof EXPECTED_HEADERS)[number];

export const HEADER_LABELS: Record<
  ExpectedHeader,
  { label: string; required: boolean; description: string }
> = {
  admissionNo: {
    label: "Admission Number",
    required: true,
    description: "Unique student admission/ID number",
  },
  firstName: { label: "First Name", required: true, description: "Student's first name" },
  lastName: { label: "Last Name", required: true, description: "Student's surname / last name" },
  gender: { label: "Gender", required: true, description: "M or F" },
  dob: { label: "Date of Birth", required: true, description: "Format: YYYY-MM-DD" },
  className: { label: "Class Name", required: true, description: "Exact class name in school" },
  parentName: { label: "Parent Name", required: true, description: "Full name of parent/guardian" },
  parentPhone: {
    label: "Parent Phone",
    required: true,
    description: "Phone number with country code",
  },
  parentEmail: { label: "Parent Email", required: true, description: "Valid email address" },
  parentRelationship: {
    label: "Relationship",
    required: true,
    description: "Father, Mother, Guardian, etc.",
  },
};

export const HEADER_ALIASES: Record<ExpectedHeader, string[]> = {
  admissionNo: [
    "admissionno",
    "admission_no",
    "admission",
    "adm_no",
    "adm",
    "student_id",
    "student_id",
    "reg_no",
    "id",
  ],
  firstName: ["firstname", "first_name", "fname", "given_name", "first"],
  lastName: ["lastname", "last_name", "lname", "surname", "family_name", "last"],
  gender: ["gender", "sex"],
  dob: ["dob", "dateofbirth", "date_of_birth", "birth_date", "birthdate"],
  className: ["classname", "class_name", "class", "grade", "stream", "room"],
  parentName: ["parentname", "parent_name", "guardian_name", "parent", "guardian"],
  parentPhone: [
    "parentphone",
    "parent_phone",
    "phone",
    "contact",
    "mobile",
    "parent_contact",
    "telephone",
  ],
  parentEmail: ["parentemail", "parent_email", "email", "email_address"],
  parentRelationship: ["parentrelationship", "parent_relationship", "relationship", "relation"],
};

export interface HeaderComparisonItem {
  expectedHeader: ExpectedHeader;
  label: string;
  required: boolean;
  mappedUploadedHeader: string | null;
  status: "exact_match" | "auto_mapped" | "merged" | "missing" | "custom_mapped";
  matchConfidence: number; // 0 to 100
}

export interface ColumnComparisonResult {
  isMatchValid: boolean;
  similarityScore: number;
  items: HeaderComparisonItem[];
  uploadedHeaders: string[];
  unmappedUploadedHeaders: string[];
  missingRequiredHeaders: ExpectedHeader[];
  hasMergedNameColumn: boolean;
}

export function generateCSVTemplate(): string {
  const headers = [...EXPECTED_HEADERS];

  const sampleData = [
    [
      "P001",
      "John",
      "Doe",
      "M",
      "2018-05-15",
      "Nursery A",
      "Jane Doe",
      "+254712345678",
      "jane.doe@example.com",
      "Mother",
    ],
    [
      "P002",
      "Mary",
      "Smith",
      "F",
      "2019-03-22",
      "Pre-K B",
      "Bob Smith",
      "+254723456789",
      "bob.smith@example.com",
      "Father",
    ],
    [
      "P003",
      "David",
      "Johnson",
      "M",
      "2018-11-08",
      "Primary 1",
      "Sarah Johnson",
      "+254734567890",
      "sarah.j@example.com",
      "Mother",
    ],
  ];

  const csvContent = [
    headers.join(","),
    ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Download CSV template as file
 */
export function downloadCSVTemplate(): void {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `students_upload_template_${Date.now()}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Clean & normalize a string header for comparison
 */
function normalizeHeader(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Compare uploaded file headers with expected template headers
 */
export function compareCSVHeaders(
  uploadedHeaders: string[],
  customMapping: Partial<Record<ExpectedHeader, string>> = {},
): ColumnComparisonResult {
  const normUploadedMap = new Map<string, string>();
  uploadedHeaders.forEach((h) => {
    normUploadedMap.set(normalizeHeader(h), h);
  });

  // Check for combined name column (e.g. "name", "full_name", "student_name", "student_name")
  let mergedNameHeader: string | null = null;
  for (const h of uploadedHeaders) {
    const norm = normalizeHeader(h);
    if (["fullname", "name", "studentname", "studentname"].includes(norm)) {
      mergedNameHeader = h;
      break;
    }
  }

  const mappedUploadedHeaders = new Set<string>();
  const items: HeaderComparisonItem[] = [];
  const missingRequiredHeaders: ExpectedHeader[] = [];

  let totalWeight = 0;
  let matchedWeight = 0;

  EXPECTED_HEADERS.forEach((expKey) => {
    const info = HEADER_LABELS[expKey];
    totalWeight += info.required ? 10 : 5;

    // Check if custom mapped
    const userCustom = customMapping[expKey];
    if (userCustom && userCustom !== "__none__") {
      if (userCustom === "__MERGE_FULL_NAME__" && mergedNameHeader) {
        mappedUploadedHeaders.add(mergedNameHeader);
        matchedWeight += info.required ? 10 : 5;
        items.push({
          expectedHeader: expKey,
          label: info.label,
          required: info.required,
          mappedUploadedHeader: `[Merged from ${mergedNameHeader}]`,
          status: "merged",
          matchConfidence: 90,
        });
        return;
      }

      const uploaded = uploadedHeaders.find((h) => h === userCustom);
      if (uploaded) {
        mappedUploadedHeaders.add(uploaded);
        matchedWeight += info.required ? 10 : 5;
        items.push({
          expectedHeader: expKey,
          label: info.label,
          required: info.required,
          mappedUploadedHeader: uploaded,
          status: "custom_mapped",
          matchConfidence: 100,
        });
        return;
      }
    }

    // Exact match
    if (normUploadedMap.has(normalizeHeader(expKey))) {
      const actual = normUploadedMap.get(normalizeHeader(expKey))!;
      mappedUploadedHeaders.add(actual);
      matchedWeight += info.required ? 10 : 5;
      items.push({
        expectedHeader: expKey,
        label: info.label,
        required: info.required,
        mappedUploadedHeader: actual,
        status: "exact_match",
        matchConfidence: 100,
      });
      return;
    }

    // Alias match
    const aliases = HEADER_ALIASES[expKey] || [];
    let aliasMatchedHeader: string | null = null;

    for (const alias of aliases) {
      if (normUploadedMap.has(normalizeHeader(alias))) {
        aliasMatchedHeader = normUploadedMap.get(normalizeHeader(alias))!;
        break;
      }
    }

    if (aliasMatchedHeader && !mappedUploadedHeaders.has(aliasMatchedHeader)) {
      mappedUploadedHeaders.add(aliasMatchedHeader);
      matchedWeight += info.required ? 10 : 5;
      items.push({
        expectedHeader: expKey,
        label: info.label,
        required: info.required,
        mappedUploadedHeader: aliasMatchedHeader,
        status: "auto_mapped",
        matchConfidence: 85,
      });
      return;
    }

    // Auto-fallback for merged name column if firstName/lastName is missing
    if ((expKey === "firstName" || expKey === "lastName") && mergedNameHeader) {
      mappedUploadedHeaders.add(mergedNameHeader);
      matchedWeight += info.required ? 8 : 4;
      items.push({
        expectedHeader: expKey,
        label: info.label,
        required: info.required,
        mappedUploadedHeader: `[Merged from ${mergedNameHeader}]`,
        status: "merged",
        matchConfidence: 80,
      });
      return;
    }

    // Missing
    if (info.required) {
      missingRequiredHeaders.push(expKey);
    }

    items.push({
      expectedHeader: expKey,
      label: info.label,
      required: info.required,
      mappedUploadedHeader: null,
      status: "missing",
      matchConfidence: 0,
    });
  });

  const unmappedUploadedHeaders = uploadedHeaders.filter((h) => !mappedUploadedHeaders.has(h));
  const similarityScore = Math.round((matchedWeight / totalWeight) * 100);
  const isMatchValid = missingRequiredHeaders.length === 0;

  return {
    isMatchValid,
    similarityScore,
    items,
    uploadedHeaders,
    unmappedUploadedHeaders,
    missingRequiredHeaders,
    hasMergedNameColumn: Boolean(mergedNameHeader),
  };
}

/**
 * Parse CSV text to raw header array and row object list
 */
export function parseCSVRaw(csvText: string): {
  headers: string[];
  rawRows: Record<string, string>[];
} {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header row and one data row");
  }

  const headers = parseCSVLine(lines[0]);
  const rawRows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : "";
    });
    rawRows.push(row);
  }

  return { headers, rawRows };
}

/**
 * Transform raw CSV rows into standardized StudentCSVRow objects based on column mapping/merging
 */
export function transformRawRows(
  rawRows: Record<string, string>[],
  columnComparison: ColumnComparisonResult,
): Record<string, string>[] {
  const mappingMap = new Map<ExpectedHeader, string>();
  columnComparison.items.forEach((item) => {
    if (item.mappedUploadedHeader) {
      mappingMap.set(item.expectedHeader, item.mappedUploadedHeader);
    }
  });

  return rawRows.map((rawRow) => {
    const row: Record<string, string> = {};

    EXPECTED_HEADERS.forEach((expKey) => {
      const mappedHeader = mappingMap.get(expKey);

      if (mappedHeader && mappedHeader.startsWith("[Merged from ")) {
        // Extract original header name
        const match = mappedHeader.match(/\[Merged from (.+)\]/);
        const sourceHeader = match ? match[1] : "";
        const fullNameVal = (rawRow[sourceHeader] || "").trim();

        if (fullNameVal) {
          const parts = fullNameVal.split(/\s+/);
          if (expKey === "firstName") {
            row.firstName = parts[0] || "";
          } else if (expKey === "lastName") {
            row.lastName = parts.slice(1).join(" ") || parts[0] || "";
          }
        } else {
          row[expKey] = "";
        }
      } else if (mappedHeader && rawRow[mappedHeader] !== undefined) {
        row[expKey] = rawRow[mappedHeader].trim();
      } else {
        row[expKey] = "";
      }
    });

    return row;
  });
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Validate parsed & transformed CSV data against schema
 */
export function validateStudentsCSV(data: Record<string, string>[]): ParseResult {
  const errors: ParseResult["errors"] = [];
  const warnings: ParseResult["warnings"] = [];
  const validData: StudentCSVRow[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2;

    try {
      const validated = studentCSVSchema.parse(row);
      validData.push(validated);

      if (validated.parentPhone && !validated.parentPhone.startsWith("+")) {
        warnings.push({
          row: rowNumber,
          message: "Phone number should include country code (e.g., +254...)",
        });
      }

      const age = calculateAge(validated.dob);
      if (age < 1 || age > 25) {
        warnings.push({
          row: rowNumber,
          message: `Student age is ${age} years - please verify date of birth`,
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((error) => {
          errors.push({
            row: rowNumber,
            field: error.path.join("."),
            message: error.message,
          });
        });
      } else {
        errors.push({
          row: rowNumber,
          field: "unknown",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors,
    warnings,
  };
}

/**
 * Parse CSV file, run column comparison & validation
 */
export async function parseCSVFile(
  file: File,
  customMapping: Partial<Record<ExpectedHeader, string>> = {},
): Promise<{
  parseResult: ParseResult;
  comparisonResult: ColumnComparisonResult;
  rawHeaders: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, rawRows } = parseCSVRaw(text);
        const comparisonResult = compareCSVHeaders(headers, customMapping);

        if (!comparisonResult.isMatchValid) {
          const transformedRows = transformRawRows(rawRows, comparisonResult);
          const validation = validateStudentsCSV(transformedRows);
          validation.success = false;
          validation.errors.unshift({
            row: 1,
            field: "headers",
            message: `Column mismatch: Required columns (${comparisonResult.missingRequiredHeaders.join(
              ", ",
            )}) are missing or unmapped`,
          });
          resolve({ parseResult: validation, comparisonResult, rawHeaders: headers });
          return;
        }

        const transformedRows = transformRawRows(rawRows, comparisonResult);
        const parseResult = validateStudentsCSV(transformedRows);
        resolve({ parseResult, comparisonResult, rawHeaders: headers });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Check for duplicate admission numbers
 */
export function checkDuplicates(
  data: StudentCSVRow[],
  existingAdmissionNos: string[],
): Array<{ row: number; admissionNo: string }> {
  const duplicates: Array<{ row: number; admissionNo: string }> = [];
  const existingSet = new Set(existingAdmissionNos.map((a) => a.trim().toLowerCase()));
  const seenInFile = new Set<string>();

  data.forEach((row, index) => {
    const admissionNo = (row.admissionNo || "").trim();
    const admLower = admissionNo.toLowerCase();

    if (!admissionNo) return;

    // Check against existing database records
    if (existingSet.has(admLower)) {
      duplicates.push({
        row: index + 2,
        admissionNo,
      });
    } else if (seenInFile.has(admLower)) {
      // Check for duplicates within the file
      duplicates.push({
        row: index + 2,
        admissionNo,
      });
    }

    seenInFile.add(admLower);
  });

  return duplicates;
}

/**
 * Format validation results for display
 */
export function formatValidationSummary(result: ParseResult): string {
  const parts: string[] = [];

  if (result.success) {
    parts.push(`✅ ${result.data.length} students ready to upload`);
  } else {
    parts.push(`❌ ${result.errors.length} errors found`);
  }

  if (result.warnings.length > 0) {
    parts.push(`⚠️ ${result.warnings.length} warnings`);
  }

  return parts.join(" • ");
}
