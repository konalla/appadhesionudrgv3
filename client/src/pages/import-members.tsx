import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText, CheckCircle, AlertCircle, XCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  totalProcessed: number;
  successfulMembers: Array<{
    firstName: string;
    lastName: string;
    membershipId: string;
    federation?: string;
  }>;
  failedMembers: Array<{
    row: number;
    reason: string;
    data: any;
  }>;
  skippedMembers: Array<{
    row: number;
    reason: string;
    data: any;
  }>;
  errors: string[];
  duration: number;
}

export default function ImportMembers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAllowedRole, setIsAllowedRole] = useState<boolean>(
    user?.role === "system_admin" || user?.role === "sysadmin"
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("configure");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headerRow, setHeaderRow] = useState<boolean>(true);
  const [mappings, setMappings] = useState<Record<string, string>>({
    membershipId: "",
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    phone: "",
    email: "",
    federation: "",
    country: "",
  });
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<string>("update"); // 'update' or 'skip'

  // Trigger file input click
  const handleSelectFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t("import.fileTooLarge"),
        description: t("import.fileSizeLimit"),
        variant: "destructive",
      });
      return;
    }
    
    // Check file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
      "application/vnd.ms-excel", // xls
      "text/csv", // csv
    ];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: t("import.invalidFileType"),
        description: t("import.onlySupportedFormats"),
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    setActiveTab("preview");
    
    // Preview data
    try {
      // Créer un nouveau FormData
      const formData = new FormData();
      
      // Vérifier que le fichier existe avant de l'ajouter
      if (!file) {
        throw new Error("No file selected");
      }
      
      // Ajouter le fichier avec le nom de champ 'file' (important pour multer)
      formData.append("file", file, file.name);
      
      // Log pour confirmer que le fichier est attaché
      console.log("Sending file:", file.name, "Size:", file.size, "Type:", file.type);
      
      // Configurer l'envoi pour éviter que fetch réécrive le contenu multipart
      const response = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
        // Important: Ne pas définir le Content-Type, le navigateur le fera automatiquement
        // avec la bonne boundary pour multipart/form-data
      });
      
      // Vérifier si la requête a échoué
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", response.status, errorText);
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      // Convertir la réponse en JSON
      const data = await response.json();
      console.log("Preview response:", data);
      
      if (data && data.preview) {
        setPreviewData(data.preview);
        setAvailableColumns(data.columns || []);
        
        // Afficher un message pour confirmer les colonnes trouvées
        console.log("Available columns:", data.columns);
        
        // Attempt to auto-map columns
        if (data.suggestedMappings) {
          console.log("Suggested mappings:", data.suggestedMappings);
          setMappings(data.suggestedMappings);
        }
      } else {
        // Si la réponse n'a pas le format attendu, afficher un message d'erreur plus précis
        console.error("Unexpected response format:", data);
        toast({
          title: t("import.previewError"),
          description: data.error || t("import.errorReadingFile"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error previewing file:", error);
      
      // Afficher un message d'erreur plus détaillé
      toast({
        title: t("import.previewError"),
        description: error.message || t("import.errorReadingFile"),
        variant: "destructive",
      });
    }
  };

  // Handle column mapping change
  const handleMappingChange = (field: string, column: string) => {
    setMappings({
      ...mappings,
      [field]: column,
    });
  };

  // Start import process
  const handleImport = async () => {
    if (!selectedFile) return;
    
    // Validate required mappings
    const requiredFields = ["membershipId", "firstName", "lastName"];
    const missingFields = requiredFields.filter(field => !mappings[field]);
    
    if (missingFields.length > 0) {
      toast({
        title: t("import.missingRequiredFields"),
        description: t("import.pleaseMapRequired", { fields: missingFields.join(", ") }),
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Créer un nouveau FormData pour l'import final
      const formData = new FormData();
      
      // Vérifier que le fichier existe avant de l'ajouter
      if (!selectedFile) {
        throw new Error("No file selected");
      }
      
      // Ajouter le fichier et les options avec le nom de champ 'file'
      formData.append("file", selectedFile, selectedFile.name);
      formData.append("mappings", JSON.stringify(mappings));
      formData.append("headerRow", headerRow.toString());
      formData.append("importMode", importMode);
      
      console.log("Importing file with options:", {
        fileName: selectedFile.name,
        mappings: mappings,
        headerRow: headerRow,
        importMode: importMode
      });
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);
      
      // Utiliser fetch directement pour le multipart/form-data
      const response = await fetch("/api/import/members", {
        method: "POST",
        body: formData,
        // Important: Ne pas définir le Content-Type
      });
      
      // Arrêter l'indicateur de progression
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Vérifier si la requête a échoué
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", response.status, errorText);
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      // Convertir la réponse en JSON
      const data = await response.json();
      console.log("Import response:", data);
      
      if (data) {
        setImportResult(data);
        setActiveTab("results");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error importing file:", error);
      toast({
        title: t("import.importError"),
        description: t("import.errorProcessingFile"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Download sample template
  const handleDownloadTemplate = async () => {
    try {
      window.location.href = '/api/import/template';
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({
        title: t("import.downloadError"),
        description: t("import.errorDownloadingTemplate"),
        variant: "destructive",
      });
    }
  };

  // Download import results
  const handleDownloadResults = () => {
    if (!importResult) return;

    // Create CSV content
    let csv = "Status,Row,First Name,Last Name,Member ID,Reason\n";
    
    // Add successful members
    importResult.successfulMembers.forEach(member => {
      csv += `Success,,${member.firstName},${member.lastName},${member.membershipId},\n`;
    });
    
    // Add failed members
    importResult.failedMembers.forEach(member => {
      csv += `Failed,${member.row},${member.data.firstName || ''},${member.data.lastName || ''},${member.data.membershipId || ''},"${member.reason}"\n`;
    });
    
    // Add skipped members
    importResult.skippedMembers.forEach(member => {
      csv += `Skipped,${member.row},${member.data.firstName || ''},${member.data.lastName || ''},${member.data.membershipId || ''},"${member.reason}"\n`;
    });
    
    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'import_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If user is not allowed to access this page
  if (!isAllowedRole) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="pl-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("common.error")}</AlertTitle>
            <AlertDescription>
              {t("auth.insufficientPermissions")}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="pl-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("import.title", "Import Members")}</h1>
          <p className="text-gray-500">
            {t("import.description", "Import members from Excel or CSV files")}
          </p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure">{t("import.selectFile", "Select File")}</TabsTrigger>
          <TabsTrigger value="preview" disabled={!selectedFile}>
            {t("import.configureImport", "Configure Import")}
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!importResult}>
            {t("import.results", "Results")}
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Select File */}
        <TabsContent value="configure" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("import.uploadExcelOrCSV", "Upload Excel or CSV File")}</CardTitle>
              <CardDescription>
                {t("import.selectFileDescription", "Select an Excel or CSV file containing member data")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                onClick={handleSelectFileClick}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                />
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t("import.dragDropOrClick", "Drag and drop or click to select")}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  {t("import.supportedFormats", "Supported formats: Excel (.xlsx, .xls) and CSV (.csv)")}
                </p>
                <Button variant="outline" type="button">
                  {t("import.selectFile", "Select File")}
                </Button>
              </div>

              <div className="mt-6">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>{t("import.needHelp", "Need help formatting your file?")}</AlertTitle>
                  <AlertDescription>
                    {t("import.downloadTemplate", "Download our template file to ensure your data is formatted correctly.")}
                    <Button
                      variant="link"
                      className="px-0 text-primary"
                      onClick={handleDownloadTemplate}
                    >
                      {t("import.downloadTemplateButton", "Download Template")}
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Preview & Configure */}
        <TabsContent value="preview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("import.configureImport", "Configure Import")}</CardTitle>
              <CardDescription>
                {t("import.configureImportDescription", "Map columns from your file to member fields and configure import options")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">{t("import.options", "Import Options")}</h3>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="headerRow"
                      checked={headerRow}
                      onChange={(e) => setHeaderRow(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="headerRow">
                      {t("import.firstRowIsHeader", "First row contains column headers")}
                    </Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="importMode">{t("import.duplicateHandling", "Duplicate Handling")}</Label>
                    <Select
                      value={importMode}
                      onValueChange={(value) => setImportMode(value)}
                    >
                      <SelectTrigger id="importMode">
                        <SelectValue placeholder={t("import.selectOption", "Select an option")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">
                          {t("import.updateExisting", "Update existing members")}
                        </SelectItem>
                        <SelectItem value="skip">
                          {t("import.skipExisting", "Skip existing members")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      {importMode === "update" 
                        ? t("import.updateExistingDescription", "Members with matching membership IDs will be updated with the imported data")
                        : t("import.skipExistingDescription", "Members with matching membership IDs will be skipped during import")}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">{t("import.columnMapping", "Column Mapping")}</h3>
                  <p className="text-sm text-gray-500">
                    {t("import.columnMappingDescription", "Map each column from your file to the corresponding field in our system")}
                  </p>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="membershipId" className="font-medium text-primary">
                        {t("members.membershipId", "Membership ID")} *
                      </Label>
                      <Select
                        value={mappings.membershipId}
                        onValueChange={(value) => handleMappingChange("membershipId", value)}
                      >
                        <SelectTrigger id="membershipId">
                          <SelectValue placeholder={t("import.selectColumn", "Select column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="font-medium text-primary">
                        {t("members.firstName", "First Name")} *
                      </Label>
                      <Select
                        value={mappings.firstName}
                        onValueChange={(value) => handleMappingChange("firstName", value)}
                      >
                        <SelectTrigger id="firstName">
                          <SelectValue placeholder={t("import.selectColumn", "Select column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="font-medium text-primary">
                        {t("members.lastName", "Last Name")} *
                      </Label>
                      <Select
                        value={mappings.lastName}
                        onValueChange={(value) => handleMappingChange("lastName", value)}
                      >
                        <SelectTrigger id="lastName">
                          <SelectValue placeholder={t("import.selectColumn", "Select column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="gender">
                        {t("members.gender", "Gender")}
                      </Label>
                      <Select
                        value={mappings.gender}
                        onValueChange={(value) => handleMappingChange("gender", value)}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder={t("import.selectColumn", "Select column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">
                        {t("members.birthDate", "Birth Date")}
                      </Label>
                      <Select
                        value={mappings.birthDate}
                        onValueChange={(value) => handleMappingChange("birthDate", value)}
                      >
                        <SelectTrigger id="birthDate">
                          <SelectValue placeholder={t("import.selectColumn", "Select column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        {t("members.phone", "Phone")}
                      </Label>
                      <Select
                        value={mappings.phone}
                        onValueChange={(value) => handleMappingChange("phone", value)}
                      >
                        <SelectTrigger id="phone">
                          <SelectValue placeholder={t("import.selectColumn", "Select column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        {t("members.email", "Email")}
                      </Label>
                      <Select
                        value={mappings.email}
                        onValueChange={(value) => handleMappingChange("email", value)}
                      >
                        <SelectTrigger id="email">
                          <SelectValue placeholder={t("import.selectColumn", "Select column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="federation">
                        {t("members.federation", "Federation")}
                      </Label>
                      <Select
                        value={mappings.federation}
                        onValueChange={(value) => handleMappingChange("federation", value)}
                      >
                        <SelectTrigger id="federation">
                          <SelectValue placeholder={t("import.selectColumn", "Select column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">
                        {t("members.country", "Country")}
                      </Label>
                      <Select
                        value={mappings.country}
                        onValueChange={(value) => handleMappingChange("country", value)}
                      >
                        <SelectTrigger id="country">
                          <SelectValue placeholder={t("import.selectColumn", "Select column")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    * {t("import.requiredFields", "Required fields")}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">{t("import.dataPreview", "Data Preview")}</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          {availableColumns.slice(0, 6).map((column) => (
                            <TableHead key={column}>{column}</TableHead>
                          ))}
                          {availableColumns.length > 6 && (
                            <TableHead>...</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{index + (headerRow ? 2 : 1)}</TableCell>
                            {availableColumns.slice(0, 6).map((column) => (
                              <TableCell key={column}>{row[column] || "-"}</TableCell>
                            ))}
                            {availableColumns.length > 6 && (
                              <TableCell>...</TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-gray-500">
                    {previewData.length > 5 
                      ? t("import.showingFirstRows", "Showing first 5 rows of {{total}} total rows", { total: previewData.length }) 
                      : t("import.showingAllRows", "Showing all {{total}} rows", { total: previewData.length })}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewData([]);
                  setAvailableColumns([]);
                  setActiveTab("configure");
                }}
              >
                {t("common.back", "Back")}
              </Button>
              <Button 
                onClick={handleImport}
                disabled={isUploading}
              >
                {isUploading ? t("import.importing", "Importing...") : t("import.startImport", "Start Import")}
              </Button>
            </CardFooter>
          </Card>
          
          {isUploading && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("import.importingData", "Importing Data")}</CardTitle>
                  <CardDescription>
                    {t("import.pleaseWait", "Please wait while we process your file")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="mt-2 text-center text-sm text-gray-500">
                    {uploadProgress}% {t("import.complete", "complete")}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Step 3: Results */}
        <TabsContent value="results" className="mt-6">
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle>{t("import.importResults", "Import Results")}</CardTitle>
                <CardDescription>
                  {t("import.importCompleted", "Import completed in {{time}} seconds", { time: (importResult.duration / 1000).toFixed(1) })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl text-green-700 flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          {t("import.successful", "Successful")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-green-700">{importResult.success}</p>
                        <p className="text-sm text-green-600">
                          {((importResult.success / importResult.totalProcessed) * 100).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-amber-50 border-amber-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl text-amber-700 flex items-center">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          {t("import.skipped", "Skipped")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-amber-700">{importResult.skipped}</p>
                        <p className="text-sm text-amber-600">
                          {((importResult.skipped / importResult.totalProcessed) * 100).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-red-50 border-red-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl text-red-700 flex items-center">
                          <XCircle className="h-5 w-5 mr-2" />
                          {t("import.failed", "Failed")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-red-700">{importResult.failed}</p>
                        <p className="text-sm text-red-600">
                          {((importResult.failed / importResult.totalProcessed) * 100).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {importResult.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t("import.errors", "Errors")}</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                          {importResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Accordion type="single" collapsible>
                    {importResult.success > 0 && (
                      <AccordionItem value="successful">
                        <AccordionTrigger>
                          <span className="flex items-center text-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t("import.successfulMembers", "Successful Members")} ({importResult.success})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="overflow-x-auto border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t("members.firstName", "First Name")}</TableHead>
                                  <TableHead>{t("members.lastName", "Last Name")}</TableHead>
                                  <TableHead>{t("members.membershipId", "Member ID")}</TableHead>
                                  <TableHead>{t("members.federation", "Federation")}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importResult.successfulMembers.map((member, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{member.firstName}</TableCell>
                                    <TableCell>{member.lastName}</TableCell>
                                    <TableCell>{member.membershipId}</TableCell>
                                    <TableCell>{member.federation || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    
                    {importResult.skipped > 0 && (
                      <AccordionItem value="skipped">
                        <AccordionTrigger>
                          <span className="flex items-center text-amber-700">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {t("import.skippedMembers", "Skipped Members")} ({importResult.skipped})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="overflow-x-auto border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t("import.row", "Row")}</TableHead>
                                  <TableHead>{t("import.reason", "Reason")}</TableHead>
                                  <TableHead>{t("members.membershipId", "Member ID")}</TableHead>
                                  <TableHead>{t("members.name", "Name")}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importResult.skippedMembers.map((member, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{member.row}</TableCell>
                                    <TableCell>{member.reason}</TableCell>
                                    <TableCell>{member.data.membershipId || "-"}</TableCell>
                                    <TableCell>
                                      {member.data.firstName || ""} {member.data.lastName || ""}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    
                    {importResult.failed > 0 && (
                      <AccordionItem value="failed">
                        <AccordionTrigger>
                          <span className="flex items-center text-red-700">
                            <XCircle className="h-4 w-4 mr-2" />
                            {t("import.failedMembers", "Failed Members")} ({importResult.failed})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="overflow-x-auto border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t("import.row", "Row")}</TableHead>
                                  <TableHead>{t("import.reason", "Reason")}</TableHead>
                                  <TableHead>{t("members.membershipId", "Member ID")}</TableHead>
                                  <TableHead>{t("members.name", "Name")}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importResult.failedMembers.map((member, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{member.row}</TableCell>
                                    <TableCell>{member.reason}</TableCell>
                                    <TableCell>{member.data.membershipId || "-"}</TableCell>
                                    <TableCell>
                                      {member.data.firstName || ""} {member.data.lastName || ""}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewData([]);
                    setAvailableColumns([]);
                    setImportResult(null);
                    setActiveTab("configure");
                  }}
                >
                  {t("import.importAnother", "Import Another File")}
                </Button>
                <Button
                  variant="default"
                  onClick={handleDownloadResults}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t("import.downloadResults", "Download Results")}
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}