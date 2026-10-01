/**
 * Bulk Upload Students Dialog Component
 * Allows uploading multiple students via CSV file with column comparison & merging capabilities
 */

import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Columns,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseCSVFile,
  downloadCSVTemplate,
  checkDuplicates,
  type ParseResult,
  type StudentCSVRow,
  type ColumnComparisonResult,
  type ExpectedHeader,
} from "@/lib/csv-utils";

interface BulkUploadStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadStage = "select" | "validate" | "compare" | "review" | "uploading" | "complete";

export function BulkUploadStudentsDialog({ open, onOpenChange }: BulkUploadStudentsDialogProps) {
  const { students, classes, bulkAddStudents, currentUser } = useStore();
  const [stage, setStage] = useState<UploadStage>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedHeaders, setUploadedHeaders] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ColumnComparisonResult | null>(null);
  const [customMapping, setCustomMapping] = useState<Partial<Record<ExpectedHeader, string>>>({});
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    total: number;
    successCount: number;
    failCount: number;
    results: Array<{
      success: boolean;
      studentId?: string;
      admissionNo: string;
      name: string;
      error?: string;
    }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    downloadCSVTemplate();
    toast.success("Official CSV template downloaded");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a valid CSV file");
      return;
    }

    setSelectedFile(file);
    setStage("validate");
    validateAndCompare(file, {});
  };

  const validateAndCompare = async (
    file: File,
    mapping: Partial<Record<ExpectedHeader, string>>,
  ) => {
    try {
      const {
        parseResult: result,
        comparisonResult: comp,
        rawHeaders,
      } = await parseCSVFile(file, mapping);

      setUploadedHeaders(rawHeaders);
      setComparisonResult(comp);

      // Check for duplicate admission numbers if parse data is available
      if (result.data.length > 0) {
        const existingAdmissionNos = students.map((p) => p.admissionNo);
        const duplicates = checkDuplicates(result.data, existingAdmissionNos);

        if (duplicates.length > 0) {
          duplicates.forEach((dup) => {
            result.errors.push({
              row: dup.row,
              field: "admissionNo",
              message: `Admission number "${dup.admissionNo}" already exists in system or file`,
            });
          });
          result.success = false;
        }
      }

      setParseResult(result);
      setStage("compare");

      if (comp.isMatchValid) {
        toast.success(`Columns compared: ${comp.similarityScore}% match`);
      } else {
        toast.error(
          `Column mismatch: ${comp.missingRequiredHeaders.length} required fields unmapped`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse CSV file");
      setStage("select");
      setSelectedFile(null);
    }
  };

  const handleMappingChange = (expectedHeader: ExpectedHeader, value: string) => {
    const updated = {
      ...customMapping,
      [expectedHeader]: value,
    };
    setCustomMapping(updated);
    if (selectedFile) {
      validateAndCompare(selectedFile, updated);
    }
  };

  const handleProceedToReview = () => {
    if (!comparisonResult || !comparisonResult.isMatchValid) {
      toast.error("Cannot proceed: Please resolve column mismatches first.");
      return;
    }
    setStage("review");
  };

  const handleUpload = async () => {
    if (!parseResult || !parseResult.success || !currentUser) return;

    setStage("uploading");
    setUploadProgress(0);

    try {
      const studentsToUpload = parseResult.data.map((row: StudentCSVRow) => {
        const classRoom = classes.find(
          (c) => c.name.trim().toLowerCase() === row.className.trim().toLowerCase(),
        );

        if (!classRoom) {
          throw new Error(`Class "${row.className}" not found in system`);
        }

        return {
          student: {
            admissionNo: row.admissionNo,
            firstName: row.firstName,
            lastName: row.lastName,
            gender: row.gender as "M" | "F",
            dob: row.dob,
            classId: classRoom.id,
            schoolId: currentUser.schoolId || classRoom.schoolId,
            parentIds: [],
          },
          parent: {
            name: row.parentName,
            phone: row.parentPhone,
            email: row.parentEmail,
            relationship: row.parentRelationship,
            schoolId: currentUser.schoolId || classRoom.schoolId,
          },
        };
      });

      setUploadProgress(30);
      const result = await bulkAddStudents(studentsToUpload);

      setUploadProgress(100);
      setUploadResult(result);
      setStage("complete");

      if (result.successCount > 0) {
        toast.success(`Successfully uploaded ${result.successCount} students`);
      }
      if (result.failCount > 0) {
        toast.error(`Failed to upload ${result.failCount} students`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      setStage("review");
    }
  };

  const handleReset = () => {
    setStage("select");
    setSelectedFile(null);
    setUploadedHeaders([]);
    setComparisonResult(null);
    setCustomMapping({});
    setParseResult(null);
    setUploadProgress(0);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-5 w-5 text-primary" /> Bulk Upload Students
          </DialogTitle>
          <DialogDescription>
            Download template, compare & map columns, and bulk import students safely.
          </DialogDescription>

          {/* Stepper Header */}
          <div className="flex items-center justify-between border-b pb-3 pt-2 text-xs font-medium text-muted-foreground">
            <div
              className={`flex items-center gap-1.5 ${stage === "select" ? "text-primary font-bold" : ""}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]">
                1
              </span>
              <span>Select File</span>
            </div>
            <ArrowRight className="h-3 w-3 opacity-40" />
            <div
              className={`flex items-center gap-1.5 ${stage === "compare" ? "text-primary font-bold" : ""}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]">
                2
              </span>
              <span>Compare & Merge Columns</span>
            </div>
            <ArrowRight className="h-3 w-3 opacity-40" />
            <div
              className={`flex items-center gap-1.5 ${stage === "review" ? "text-primary font-bold" : ""}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]">
                3
              </span>
              <span>Review Data</span>
            </div>
            <ArrowRight className="h-3 w-3 opacity-40" />
            <div
              className={`flex items-center gap-1.5 ${stage === "complete" ? "text-primary font-bold" : ""}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]">
                4
              </span>
              <span>Complete</span>
            </div>
          </div>
        </DialogHeader>

        {/* Stage: Select File */}
        {stage === "select" && (
          <div className="space-y-6 py-4">
            <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-200 text-xs">
                Download the official CSV template first, fill in student details, then upload. The
                system will compare your file columns against the standard template before allowing
                upload.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-xl p-8 space-y-4 bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Upload className="h-8 w-8" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-semibold">Upload your CSV File</p>
                <p className="text-xs text-muted-foreground">
                  Select or drag & drop a .csv file containing student records
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button variant="default" asChild className="gap-2 cursor-pointer shadow-sm">
                  <span>
                    <Upload className="h-4 w-4" /> Browse CSV File
                  </span>
                </Button>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-xl bg-card gap-4">
              <div>
                <p className="text-sm font-semibold">Need the standard format?</p>
                <p className="text-xs text-muted-foreground">
                  Download our pre-formatted template with all required columns and sample rows.
                </p>
              </div>
              <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2 shrink-0">
                <Download className="h-4 w-4" />
                Download CSV Template
              </Button>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground border-t pt-4">
              <p className="font-semibold text-foreground">Standard Column Requirements:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p>
                  • admissionNo <span className="text-red-500">*</span>
                </p>
                <p>
                  • firstName <span className="text-red-500">*</span>
                </p>
                <p>
                  • lastName <span className="text-red-500">*</span>
                </p>
                <p>
                  • gender (M/F) <span className="text-red-500">*</span>
                </p>
                <p>
                  • dob (YYYY-MM-DD) <span className="text-red-500">*</span>
                </p>
                <p>
                  • className <span className="text-red-500">*</span>
                </p>
                <p>
                  • parentName <span className="text-red-500">*</span>
                </p>
                <p>
                  • parentPhone <span className="text-red-500">*</span>
                </p>
                <p>
                  • parentEmail <span className="text-red-500">*</span>
                </p>
                <p>
                  • parentRelationship <span className="text-red-500">*</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stage: Validate Spinner */}
        {stage === "validate" && (
          <div className="space-y-4 py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-10 w-10 text-primary animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Comparing file columns against template...</p>
                <p className="text-xs text-muted-foreground">
                  Checking structure and mapping headers
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stage: Compare & Merge Columns */}
        {stage === "compare" && comparisonResult && (
          <div className="space-y-6 py-2">
            {/* Column Comparison Header Banner */}
            <div className="p-4 border rounded-xl bg-card space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Columns className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-bold">Column Similarity Analysis</p>
                    <p className="text-xs text-muted-foreground">
                      File:{" "}
                      <span className="font-mono text-foreground font-medium">
                        {selectedFile?.name}
                      </span>{" "}
                      ({uploadedHeaders.length} columns detected)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={comparisonResult.similarityScore >= 80 ? "default" : "destructive"}
                    className="text-xs px-2.5 py-1"
                  >
                    {comparisonResult.similarityScore}% Header Match
                  </Badge>
                  {comparisonResult.isMatchValid ? (
                    <Badge
                      variant="outline"
                      className="border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Ready to Proceed
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" /> Mismatch Detected
                    </Badge>
                  )}
                </div>
              </div>

              {/* Blocking Warning Alert */}
              {!comparisonResult.isMatchValid ? (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">
                    <span className="font-bold block">
                      Upload Blocked: Required columns are missing or unmapped!
                    </span>
                    The system prevents upload when headers do not match. Please map the missing
                    required fields below or click <strong>Download CSV Template</strong> to use the
                    standard column format.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="py-2 bg-green-50/60 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-xs">
                    All required template columns are matched! You can review or adjust column
                    mappings below before proceeding to data review.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Column Comparison & Remapping Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Template vs Uploaded Columns Comparison
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="h-7 text-xs gap-1.5 text-primary"
                >
                  <Download className="h-3.5 w-3.5" /> Download Standard Template
                </Button>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[180px]">Standard Target Field</TableHead>
                      <TableHead className="w-[80px]">Required</TableHead>
                      <TableHead className="w-[140px]">Match Status</TableHead>
                      <TableHead>Uploaded CSV Column Mapping</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonResult.items.map((item) => (
                      <TableRow
                        key={item.expectedHeader}
                        className={
                          item.status === "missing" && item.required
                            ? "bg-red-50/40 dark:bg-red-950/20"
                            : ""
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs">{item.expectedHeader}</span>
                            <p className="text-[11px] text-muted-foreground">{item.label}</p>
                          </div>
                        </TableCell>

                        <TableCell>
                          {item.required ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                            >
                              Required
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Optional</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {item.status === "exact_match" && (
                            <Badge
                              variant="outline"
                              className="border-green-500 text-green-700 bg-green-50 dark:bg-green-950/40 text-[11px] gap-1"
                            >
                              <CheckCircle className="h-3 w-3 text-green-600" /> Matched
                            </Badge>
                          )}
                          {item.status === "auto_mapped" && (
                            <Badge
                              variant="outline"
                              className="border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/40 text-[11px]"
                            >
                              Auto-Mapped
                            </Badge>
                          )}
                          {item.status === "merged" && (
                            <Badge
                              variant="outline"
                              className="border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-950/40 text-[11px] gap-1"
                            >
                              <Columns className="h-3 w-3 text-purple-600" /> Merged Name
                            </Badge>
                          )}
                          {item.status === "custom_mapped" && (
                            <Badge
                              variant="outline"
                              className="border-indigo-500 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-[11px]"
                            >
                              Mapped
                            </Badge>
                          )}
                          {item.status === "missing" && (
                            <Badge variant="destructive" className="text-[11px] gap-1">
                              <AlertTriangle className="h-3 w-3" /> Missing
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <Select
                            value={
                              customMapping[item.expectedHeader] ||
                              (item.mappedUploadedHeader?.startsWith("[Merged from ")
                                ? "__MERGE_FULL_NAME__"
                                : item.mappedUploadedHeader || "__none__")
                            }
                            onValueChange={(val) => handleMappingChange(item.expectedHeader, val)}
                          >
                            <SelectTrigger className="h-8 text-xs font-mono w-full max-w-xs">
                              <SelectValue placeholder="-- Select CSV Column --" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="__none__"
                                className="text-xs text-muted-foreground italic"
                              >
                                -- Not Mapped --
                              </SelectItem>
                              {comparisonResult.hasMergedNameColumn &&
                                (item.expectedHeader === "firstName" ||
                                  item.expectedHeader === "lastName") && (
                                  <SelectItem
                                    value="__MERGE_FULL_NAME__"
                                    className="text-xs font-semibold text-purple-700"
                                  >
                                    🔀 Merge from Full Name column
                                  </SelectItem>
                                )}
                              {uploadedHeaders.map((header) => (
                                <SelectItem
                                  key={header}
                                  value={header}
                                  className="text-xs font-mono"
                                >
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Unmapped Extra Columns Banner if any */}
            {comparisonResult.unmappedUploadedHeaders.length > 0 && (
              <div className="p-3 border rounded-lg bg-muted/30 text-xs space-y-1">
                <p className="font-semibold text-muted-foreground">
                  Extra Columns in Uploaded File (Ignored):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {comparisonResult.unmappedUploadedHeaders.map((col) => (
                    <Badge key={col} variant="secondary" className="font-mono text-[10px]">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage: Review Data */}
        {stage === "review" && parseResult && (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{selectedFile?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {parseResult.data.length} valid student records found
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStage("compare")}
                className="gap-1 text-xs"
              >
                <Columns className="h-3.5 w-3.5" /> Adjust Column Mapping
              </Button>
            </div>

            {/* Validation Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-xl bg-card">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg dark:bg-blue-950 dark:text-blue-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{parseResult.data.length}</p>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-xl bg-card">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg dark:bg-red-950 dark:text-red-300">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{parseResult.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Data Errors</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-xl bg-card">
                <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg dark:bg-yellow-950 dark:text-yellow-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{parseResult.warnings.length}</p>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </div>
              </div>
            </div>

            {/* Errors List */}
            {parseResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-1 text-xs">Errors found in CSV data:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {parseResult.errors.map((error, i) => (
                      <p key={i} className="text-xs font-mono">
                        Row {error.row}, {error.field}: {error.message}
                      </p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings List */}
            {parseResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-1 text-xs">Data Warnings:</p>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {parseResult.warnings.map((warning, i) => (
                      <p key={i} className="text-xs">
                        Row {warning.row}: {warning.message}
                      </p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            {parseResult.data.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Preview Parsed Data (First 5 Students)
                </p>
                <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-xs">Admission No</TableHead>
                        <TableHead className="text-xs">Full Name</TableHead>
                        <TableHead className="text-xs">Gender</TableHead>
                        <TableHead className="text-xs">DOB</TableHead>
                        <TableHead className="text-xs">Class Name</TableHead>
                        <TableHead className="text-xs">Parent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.data.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs font-medium">
                            {row.admissionNo}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.firstName} {row.lastName}
                          </TableCell>
                          <TableCell className="text-xs">{row.gender}</TableCell>
                          <TableCell className="text-xs font-mono">{row.dob}</TableCell>
                          <TableCell className="text-xs font-medium">{row.className}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.parentName} ({row.parentPhone})
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parseResult.data.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    ... and {parseResult.data.length - 5} more students ready for upload
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stage: Uploading */}
        {stage === "uploading" && (
          <div className="space-y-6 py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-12 w-12 text-primary animate-spin" />
              <p className="text-base font-semibold">Uploading students to database...</p>
              <Progress value={uploadProgress} className="w-full max-w-md" />
              <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
            </div>
          </div>
        )}

        {/* Stage: Complete */}
        {stage === "complete" && uploadResult && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center space-y-3 py-6">
              {uploadResult.failCount === 0 ? (
                <div className="p-4 bg-green-100 dark:bg-green-950 text-green-600 rounded-full">
                  <CheckCircle className="h-12 w-12" />
                </div>
              ) : (
                <div className="p-4 bg-yellow-100 dark:bg-yellow-950 text-yellow-600 rounded-full">
                  <AlertCircle className="h-12 w-12" />
                </div>
              )}
              <div className="text-center space-y-1">
                <p className="text-lg font-bold">Bulk Upload Complete</p>
                <p className="text-xs text-muted-foreground">
                  {uploadResult.successCount} of {uploadResult.total} students successfully
                  registered
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-xl bg-green-50/50 dark:bg-green-950/20 border-green-200">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {uploadResult.successCount}
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-300">
                    Successfully Imported
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-xl bg-red-50/50 dark:bg-red-950/20 border-red-200">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {uploadResult.failCount}
                  </p>
                  <p className="text-xs text-red-800 dark:text-red-300">Failed Records</p>
                </div>
              </div>
            </div>

            {uploadResult.failCount > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Failed Records:</p>
                <div className="border rounded-xl max-h-44 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-xs">Admission No</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadResult.results
                        .filter((r) => !r.success)
                        .map((result, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">
                              {result.admissionNo}
                            </TableCell>
                            <TableCell className="text-xs">{result.name}</TableCell>
                            <TableCell className="text-xs text-red-600">{result.error}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 border-t pt-4">
          {stage === "select" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {stage === "compare" && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Select Different File
              </Button>
              <Button
                onClick={handleProceedToReview}
                disabled={!comparisonResult?.isMatchValid}
                className="gap-2"
              >
                Proceed to Review Data <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {stage === "review" && (
            <>
              <Button variant="outline" onClick={() => setStage("compare")}>
                Back to Column Compare
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!parseResult?.success || parseResult.data.length === 0}
                className="gap-2"
              >
                <Upload className="h-4 w-4" /> Upload {parseResult?.data.length || 0} Students
              </Button>
            </>
          )}

          {stage === "complete" && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Upload Another CSV
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
