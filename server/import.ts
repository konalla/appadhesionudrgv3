import multer from 'multer';
import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import XLSX from 'xlsx';
import fetch from 'node-fetch';
import { IStorage } from './storage';
import { Member, User } from '@shared/schema';
import { requireAuth, requireRole, AuthenticatedRequest } from './middlewares/auth';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Utiliser un chemin absolu pour éviter les problèmes de dossier relatif
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    console.log('Upload directory:', uploadDir);
    
    // Create directory if doesn't exist
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
        console.log('Created uploads directory');
      }
      
      // Vérifier les permissions du dossier
      fs.accessSync(uploadDir, fs.constants.W_OK);
      console.log('Directory is writable');
      
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error setting up upload directory:', error);
      cb(error as any, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const filename = 'import-' + uniqueSuffix + ext;
      console.log('Generated filename:', filename);
      cb(null, filename);
    } catch (error) {
      console.error('Error generating filename:', error);
      cb(error as any, '');
    }
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only csv, xlsx, xls files
  const allowedTypes = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Function to download external images and store them locally
async function downloadExternalImage(imageUrl: string, membershipId: string): Promise<string | null> {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null;
  }

  // Check if it's a valid external URL
  const urlPattern = /^https?:\/\/.+/i;
  if (!urlPattern.test(imageUrl.trim())) {
    return null;
  }

  const cleanUrl = imageUrl.trim();
  console.log(`[Image Download] Attempting to download image for member ${membershipId}:`, cleanUrl);

  try {
    // Download the image
    const response = await fetch(cleanUrl, {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'UDRG-Membership-System/1.0'
      }
    });

    if (!response.ok) {
      console.log(`[Image Download] Failed to download image for member ${membershipId}: HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`[Image Download] Invalid content type for member ${membershipId}:`, contentType);
      return null;
    }

    // Determine file extension from content type
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('gif')) extension = 'gif';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';

    // Create unique filename
    const timestamp = Date.now();
    const filename = `imported_${membershipId}_${timestamp}.${extension}`;
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    const filepath = path.join(uploadDir, filename);

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Download and save the image
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Validate image size (max 5MB)
    if (imageBuffer.length > 5 * 1024 * 1024) {
      console.log(`[Image Download] Image too large for member ${membershipId}: ${imageBuffer.length} bytes`);
      return null;
    }

    fs.writeFileSync(filepath, imageBuffer);
    console.log(`[Image Download] Successfully downloaded and saved image for member ${membershipId}: ${filename} (${imageBuffer.length} bytes)`);

    return filename;
  } catch (error) {
    console.error(`[Image Download] Error downloading image for member ${membershipId}:`, error);
    return null;
  }
}

export default function createImportRoutes(storage: IStorage) {
  const router = Router();
  
  // Route for downloading template
  router.get('/template', (req: Request, res: Response) => {
    try {
      // Create a simple Excel template
      const wb = XLSX.utils.book_new();
      
      // Create sample data
      const sampleData = [
        {
          'Member ID': 'M001',
          'First Name': 'John',
          'Last Name': 'Doe',
          'Gender': 'male',
          'Birth Date': '1985-01-15',
          'Birth Place': 'Mamou',
          'Phone': '+224657000001',
          'Email': 'john.doe@example.com',
          'Federation': 'Conakry',
          'Section': 'Kaloum',
          'Country': 'Guinea',
          'Address': '123 Main St',
          'City': 'Conakry',
          'Voter Card Status': 'yes',
          'Voter Card Number': 'VC123456',
          'Occupation': 'Teacher',
          'Education': 'university',
          'Photo URL': 'https://storage.googleapis.com/msgsndr/jLl04tZu3UlNYJ8lZfh7/media/67fca2c671384b027cb47a51.jpeg'
        },
        {
          'Member ID': 'M002',
          'First Name': 'Jane',
          'Last Name': 'Smith',
          'Gender': 'female',
          'Birth Date': '1990-05-20',
          'Birth Place': 'Kankan',
          'Phone': '+224657000002',
          'Email': 'jane.smith@example.com',
          'Federation': 'Kankan',
          'Section': 'Centre',
          'Country': 'Guinea',
          'Address': '456 Oak St',
          'City': 'Kankan',
          'Voter Card Status': 'processing',
          'Voter Card Number': '',
          'Occupation': 'Engineer',
          'Education': 'graduate',
          'Photo URL': 'https://storage.googleapis.com/msgsndr/jLl04tZu3UlNYJ8lZfh7/media/67fca2c63baf5d02f68794fa.jpeg'
        }
      ];
      
      // Create worksheet and add to workbook
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Members');
      
      // Auto-size columns
      const colWidths = [
        { wch: 12 }, // Member ID
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 10 }, // Gender
        { wch: 12 }, // Birth Date
        { wch: 15 }, // Birth Place
        { wch: 15 }, // Phone
        { wch: 25 }, // Email
        { wch: 15 }, // Federation
        { wch: 15 }, // Section
        { wch: 12 }, // Country
        { wch: 25 }, // Address
        { wch: 15 }, // City
        { wch: 15 }, // Voter Card Status
        { wch: 15 }, // Voter Card Number
        { wch: 20 }, // Occupation
        { wch: 12 }, // Education
        { wch: 40 }, // Photo URL
      ];
      
      ws['!cols'] = colWidths;
      
      // Create a buffer
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=udrg-members-template.xlsx');
      
      // Send the file
      res.send(Buffer.from(buf));
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  });

  // Route for previewing file data
  router.post('/preview', requireAuth, requireRole(['system_admin', 'sysadmin']), upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        console.error('No file uploaded in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      console.log('File received:', req.file.originalname, 'Size:', req.file.size, 'MIME:', req.file.mimetype);
      
      const filePath = req.file.path;
      console.log('File saved to:', filePath);
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        console.error('File does not exist at path:', filePath);
        return res.status(500).json({ error: 'File upload failed - file not found on server' });
      }
      
      // Vérifier les permissions sur le fichier
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
        console.log('File is readable');
      } catch (error) {
        console.error('File permission error:', error);
        return res.status(500).json({ error: 'Cannot read uploaded file (permission denied)' });
      }
      
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      console.log('File extension:', fileExt);
      
      let data: any[] = [];
      let columns: string[] = [];
      let suggestedMappings: Record<string, string> = {};
      
      // Parse file based on extension
      if (fileExt === '.csv') {
        console.log('Parsing CSV file');
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          console.log('CSV file content length:', fileContent.length);
          
          data = parseCsv(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
          });
          
          console.log('CSV parsing successful, rows:', data.length);
          
          if (data.length > 0) {
            columns = Object.keys(data[0]);
            console.log('CSV columns:', columns);
          }
        } catch (error) {
          console.error('Error parsing CSV:', error);
          return res.status(400).json({ error: 'Failed to parse CSV file: ' + (error as Error).message });
        }
      } else if (fileExt === '.xlsx' || fileExt === '.xls') {
        console.log('Parsing Excel file');
        try {
          const workbook = XLSX.readFile(filePath);
          console.log('Excel file read successful, sheets:', workbook.SheetNames);
          
          if (workbook.SheetNames.length === 0) {
            return res.status(400).json({ error: 'Excel file contains no sheets' });
          }
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          console.log('Using sheet:', sheetName);
          
          data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
          console.log('Excel parsing successful, rows:', data.length);
          
          // Extract headers (first row)
          if (data.length > 0) {
            columns = data[0] as string[];
            console.log('Excel columns:', columns);
            
            // Convert data to objects with column headers
            const jsonData = [];
            for (let i = 1; i < Math.min(data.length, 10); i++) {
              const row: any = {};
              for (let j = 0; j < columns.length; j++) {
                row[columns[j]] = data[i][j];
              }
              jsonData.push(row);
            }
            data = jsonData;
          } else {
            return res.status(400).json({ error: 'Excel file is empty or contains no data' });
          }
        } catch (error) {
          console.error('Error parsing Excel:', error);
          return res.status(400).json({ error: 'Failed to parse Excel file: ' + (error as Error).message });
        }
      } else {
        console.error('Unsupported file extension:', fileExt);
        return res.status(400).json({ error: `Unsupported file format: ${fileExt}. Please use CSV, XLS, or XLSX files.` });
      }
      
      // Try to suggest mappings
      if (columns.length > 0) {
        // Common field name patterns
        const patterns = {
          membershipId: ['member id', 'memberid', 'id', 'memberno', 'member no', 'member number', 'membership id', 'membership number', 'membership no'],
          firstName: ['first name', 'firstname', 'first', 'prenom', 'prénom', 'given name'],
          lastName: ['last name', 'lastname', 'last', 'nom', 'surname', 'family name'],
          gender: ['gender', 'sex', 'genre'],
          birthDate: ['birth date', 'birthdate', 'date of birth', 'dob', 'date de naissance'],
          birthPlace: ['birth place', 'birthplace', 'lieu de naissance', 'lieu', 'place of birth', 'origine', 'origin'],
          phone: ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'tel', 'téléphone'],
          email: ['email', 'e-mail', 'mail', 'courriel'],
          federation: ['federation', 'fédération', 'chapter'],
          section: ['section', 'sous-section', 'local', 'quartier', 'district', 'branch'],
          country: ['country', 'pays', 'nation'],
          city: ['city', 'ville', 'town', 'cité', 'localité'],
          occupation: ['occupation', 'job', 'profession', 'métier', 'work', 'emploi'],
          hasVoterCard: ['voter card status', 'voter card', 'carte électorale', 'carte d\'électeur', 'voter status'],
          voterCardNumber: ['voter card number', 'voter number', 'numéro de carte électorale', 'numéro carte d\'électeur'],
          education: ['education', 'éducation', 'studies', 'études', 'school', 'formation'],
          photoId: ['photo', 'photo id', 'photo url', 'picture', 'image', 'photo_url'],
        };
        
        // Find best matches
        for (const [field, keywords] of Object.entries(patterns)) {
          for (const col of columns) {
            const colLower = col.toLowerCase();
            if (keywords.some(keyword => colLower === keyword || colLower.includes(keyword))) {
              suggestedMappings[field] = col;
              break;
            }
          }
        }
      }
      
      // Clean up the temporary file
      fs.unlinkSync(filePath);
      
      // Return preview data
      return res.json({
        preview: data.slice(0, 10), // Just send the first 10 rows
        columns,
        suggestedMappings,
        rowCount: data.length
      });
    } catch (error) {
      console.error('Error previewing file:', error);
      // Clean up the file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ error: 'Failed to preview file' });
    }
  });

  // Route for actual import
  router.post('/members', requireAuth, requireRole(['system_admin', 'sysadmin']), upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Get import options from request
      const mappings = req.body.mappings ? JSON.parse(req.body.mappings) : {};
      const headerRow = req.body.headerRow === 'true';
      const importMode = req.body.importMode || 'update';
      
      // Validate required mappings
      const requiredFields = ['membershipId', 'firstName', 'lastName'];
      const missingFields = requiredFields.filter(field => !mappings[field]);
      
      if (missingFields.length > 0) {
        // Clean up the file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: `Missing required mappings: ${missingFields.join(', ')}`
        });
      }
      
      const filePath = req.file.path;
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      
      let rawData: any[] = [];
      
      // Parse file based on extension
      if (fileExt === '.csv') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (headerRow) {
          rawData = parseCsv(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
          });
        } else {
          // Parse without header
          const rows = parseCsv(fileContent, {
            columns: false,
            skip_empty_lines: true,
            trim: true
          });
          
          // Use first row to create column names
          const headers = rows[0].map((_: any, i: number) => `col${i + 1}`);
          rawData = rows.map((row: any) => {
            const obj: any = {};
            headers.forEach((header: string, i: number) => {
              obj[header] = row[i];
            });
            return obj;
          });
        }
      } else if (fileExt === '.xlsx' || fileExt === '.xls') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (headerRow) {
          rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        } else {
          // Parse without header
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
          
          // Use column indices as headers
          const headers = (data[0] as any[]).map((_: any, i: number) => `col${i + 1}`);
          rawData = [];
          
          for (let i = 0; i < data.length; i++) {
            const row: any = {};
            const currentRow = data[i] as any[];
            for (let j = 0; j < headers.length; j++) {
              row[headers[j]] = currentRow[j];
            }
            rawData.push(row);
          }
        }
      }
      
      // Process import
      const result = {
        success: 0,
        failed: 0,
        skipped: 0,
        totalProcessed: rawData.length,
        successfulMembers: [] as any[],
        failedMembers: [] as any[],
        skippedMembers: [] as any[],
        errors: [] as string[],
        duration: 0
      };
      
      // Get existing members for duplication check
      const existingMembers = await storage.getAllMembers(); // Membres actifs uniquement
      
      // Récupérer également tous les membres, y compris ceux qui sont supprimés
      const allMembersIncludingDeleted = await storage.getAllMembersIncludingDeleted();
      
      // Créer un ensemble avec tous les IDs de membres (actifs et supprimés)
      // pour vérifier les conflits potentiels dans la base de données
      const allMembershipIds = new Set(
        allMembersIncludingDeleted.map((m: Member) => m.membershipId)
      );
      
      // Créer des ensembles pour la vérification de duplication
      // Nous filtrons pour ne considérer que les membres actifs (non supprimés)
      const existingMemberIds = new Set(
        existingMembers.map(m => m.membershipId)
      );
      
      const existingPhones = new Set(
        existingMembers
          .filter(m => m.phone)
          .map(m => m.phone)
      );
      
      const existingEmails = new Set(
        existingMembers
          .filter(m => m.email)
          .map(m => m.email?.toLowerCase())
      );
      
      // Process each row
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        const rowIndex = headerRow ? i + 2 : i + 1; // Adding 2 if header row (1 for header, 1 for 1-based indexing)
        
        try {
          // Préparer les données de base
          const memberData: any = {
            membershipId: (row[mappings.membershipId] || '').toString().trim(),
            firstName: (row[mappings.firstName] || '').toString().trim(),
            lastName: (row[mappings.lastName] || '').toString().trim(),
            // Ne pas inclure registrationDate - il sera généré automatiquement par le schéma
            // Valeurs par défaut pour les champs requis mais non présents dans l'import
            gender: 'unknown', // Valeur par défaut qui sera écrasée si présente
            birthDate: '2000-01-01', // Valeur par défaut qui sera écrasée si présente
            birthPlace: 'Non spécifié', // Champ obligatoire, valeur par défaut
            phone: '+224000000000', // Valeur par défaut qui sera écrasée si présente
            country: 'Guinée', // Valeur par défaut qui sera écrasée si présente
            city: 'Non spécifié', // Valeur par défaut qui sera écrasée si présente
            occupation: 'Non spécifié', // Valeur par défaut qui sera écrasée si présente
            federation: 'Non spécifié', // Valeur par défaut qui sera écrasée si présente
            hasVoterCard: 'no', // Valeur par défaut qui sera écrasée si présente
          };
          
          // Add optional fields if they exist
          if (mappings.gender && row[mappings.gender]) {
            const genderValue = row[mappings.gender].toString().toLowerCase().trim();
            // Normalize gender values
            if (['m', 'male', 'homme', 'masculin', 'h'].includes(genderValue)) {
              memberData.gender = 'male';
            } else if (['f', 'female', 'femme', 'féminin'].includes(genderValue)) {
              memberData.gender = 'female';
            } else {
              memberData.gender = genderValue;
            }
          }
          
          if (mappings.birthDate && row[mappings.birthDate]) {
            try {
              // Try to parse the date
              const dateValue = row[mappings.birthDate];
              
              // Gérer différents formats de date
              let dateStr = '';
              
              if (typeof dateValue === 'number') {
                // Excel date number (days since 1900)
                const excelEpoch = new Date(1899, 11, 30);
                const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
                dateStr = date.toISOString().split('T')[0];
              } else if (typeof dateValue === 'string') {
                // Vérifier si c'est une date dans un format YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                  dateStr = dateValue;
                } else {
                  // Essayer de parser comme une date JavaScript
                  const date = new Date(dateValue);
                  if (!isNaN(date.getTime())) {
                    dateStr = date.toISOString().split('T')[0];
                  }
                }
              } else if (dateValue instanceof Date) {
                // C'est déjà un objet Date
                dateStr = dateValue.toISOString().split('T')[0];
              }
              
              // Assigner la date si on a réussi à la parser
              if (dateStr) {
                memberData.birthDate = dateStr;
              }
            } catch (error) {
              console.warn(`Invalid date format in row ${rowIndex}:`, error);
            }
          }
          
          if (mappings.phone && row[mappings.phone]) {
            memberData.phone = row[mappings.phone].toString().trim();
          }
          
          if (mappings.email && row[mappings.email]) {
            memberData.email = row[mappings.email].toString().trim();
          }
          
          if (mappings.federation && row[mappings.federation]) {
            const federationName = row[mappings.federation].toString().trim();
            memberData.federation = federationName;
            
            // Rechercher la fédération dans la liste des fédérations
            const federations = await storage.getAllFederations();
            let matchingFederation = federations.find(fed => 
              fed.name.toLowerCase() === federationName.toLowerCase()
            );
            
            // Si la fédération n'existe pas, essayer une correspondance partielle
            if (!matchingFederation) {
              matchingFederation = federations.find(fed => 
                fed.name.toLowerCase().includes(federationName.toLowerCase()) ||
                federationName.toLowerCase().includes(fed.name.toLowerCase())
              );
            }
            
            // Si toujours pas de correspondance, créer la fédération
            if (!matchingFederation) {
              console.log(`Création automatique de la fédération: ${federationName}`);
              try {
                // Créer la nouvelle fédération
                const newFederation = await storage.createFederation({
                  name: federationName,
                  name_en: federationName,
                  country: "Guinea",
                  country_en: "Guinea",
                  regionId: 2, // Région par défaut pour la Guinée
                  description: `Fédération créée automatiquement lors de l'importation`
                });
                
                console.log(`Fédération créée avec succès: "${federationName}" (ID: ${newFederation.id})`);
                matchingFederation = newFederation;
              } catch (createError) {
                console.error(`Erreur lors de la création de la fédération "${federationName}":`, createError);
              }
            }
            
            if (matchingFederation) {
              memberData.federationId = matchingFederation.id;
              memberData.regionId = matchingFederation.regionId || 2; // Région par défaut si non spécifiée
            }
          }
          
          // Traitement de la section
          if (mappings.section && row[mappings.section]) {
            const sectionName = row[mappings.section].toString().trim();
            memberData.section = sectionName;
            
            // Si une fédération est définie, essayer de trouver la section correspondante
            if (memberData.federationId) {
              try {
                // Rechercher la section dans la base de données
                const sections = await storage.getAllSections();
                
                // Essayer plusieurs méthodes de correspondance
                let matchingSection = sections.find(section => 
                  section.name.toLowerCase() === sectionName.toLowerCase() && 
                  section.federationId === memberData.federationId
                );
                
                // Si pas de correspondance exacte, essayer une correspondance partielle
                if (!matchingSection) {
                  matchingSection = sections.find(section => {
                    // Vérifier si le nom de la section dans la BD contient le nom de section importé
                    const dbNameContainsImported = section.name.toLowerCase().includes(sectionName.toLowerCase());
                    
                    // Vérifier si le nom de section importé contient le nom de la section dans la BD
                    const importedContainsDbName = sectionName.toLowerCase().includes(section.name.toLowerCase());
                    
                    // Accepter la correspondance si l'une des conditions est vraie et la fédération correspond
                    return (dbNameContainsImported || importedContainsDbName) && 
                           section.federationId === memberData.federationId;
                  });
                }
                
                if (matchingSection) {
                  console.log(`Found matching section "${matchingSection.name}" (ID: ${matchingSection.id}) for member`);
                  memberData.sectionId = matchingSection.id;
                } else {
                  // Si la section n'existe pas, la créer automatiquement
                  console.log(`Section "${sectionName}" not found. Creating it automatically.`);
                  try {
                    const newSection = await storage.createSection({
                      name: sectionName,
                      name_en: sectionName,
                      federationId: memberData.federationId,
                      description: `Section créée automatiquement lors de l'importation`
                    });
                    
                    console.log(`Successfully created section "${sectionName}" with ID ${newSection.id}`);
                    memberData.sectionId = newSection.id;
                  } catch (createError) {
                    console.error(`Failed to create section "${sectionName}":`, createError);
                    console.log(`Section "${sectionName}" not found in database, storing as text only`);
                  }
                }
              } catch (error) {
                console.warn(`Error finding section: ${error}`);
              }
            }
          }
          
          if (mappings.country && row[mappings.country]) {
            memberData.country = row[mappings.country].toString().trim();
          }
          
          // Gérer les autres champs obligatoires qui ne sont pas dans le template Excel
          if (mappings.city && row[mappings.city]) {
            memberData.city = row[mappings.city].toString().trim();
          }
          
          if (mappings.occupation && row[mappings.occupation]) {
            memberData.occupation = row[mappings.occupation].toString().trim();
          }
          
          if (mappings.hasVoterCard && row[mappings.hasVoterCard]) {
            const voterCardValue = row[mappings.hasVoterCard].toString().toLowerCase().trim();
            if (['yes', 'oui', 'y', 'true', '1'].includes(voterCardValue)) {
              memberData.hasVoterCard = 'yes';
            } else if (['processing', 'encours', 'en cours'].includes(voterCardValue)) {
              memberData.hasVoterCard = 'processing';
            } else {
              memberData.hasVoterCard = 'no';
            }
          }
          
          // Carte d'électeur
          if (mappings.voterCardNumber && row[mappings.voterCardNumber]) {
            memberData.voterCardNumber = row[mappings.voterCardNumber].toString().trim();
          }
          
          // Champ birthPlace (lieu de naissance) obligatoire
          if (mappings.birthPlace && row[mappings.birthPlace]) {
            memberData.birthPlace = row[mappings.birthPlace].toString().trim();
          }
          
          // Champ éducation (optionnel)
          if (mappings.education && row[mappings.education]) {
            const educationValue = row[mappings.education].toString().toLowerCase().trim();
            // Normaliser les valeurs d'éducation pour correspondre aux options attendues
            const validOptions = ['primary', 'secondary', 'university', 'graduate', 'doctorate', 'other'];
            
            if (validOptions.includes(educationValue)) {
              memberData.education = educationValue;
            } else if (['primaire', 'elementary'].includes(educationValue)) {
              memberData.education = 'primary';
            } else if (['secondaire', 'lycée', 'high school'].includes(educationValue)) {
              memberData.education = 'secondary';
            } else if (['université', 'college'].includes(educationValue)) {
              memberData.education = 'university';
            } else if (['master', 'masters', 'maitrise', 'maîtrise'].includes(educationValue)) {
              memberData.education = 'graduate';
            } else if (['doctorat', 'phd', 'ph.d'].includes(educationValue)) {
              memberData.education = 'doctorate';
            } else {
              memberData.education = 'other';
              memberData.educationOther = row[mappings.education].toString().trim();
            }
          }
          
          // Enhanced photo processing using new download function
          if (mappings.photoId && row[mappings.photoId]) {
            const photoValue = row[mappings.photoId].toString().trim();
            if (photoValue) {
              console.log(`[Import] Processing photo for member ${memberData.membershipId}: ${photoValue}`);
              
              // Check if it's an external URL that needs downloading
              if (photoValue.startsWith('http')) {
                const downloadedFilename = await downloadExternalImage(photoValue, memberData.membershipId);
                if (downloadedFilename) {
                  memberData.photoId = downloadedFilename;
                  console.log(`[Import] Successfully processed external image for member ${memberData.membershipId}: ${downloadedFilename}`);
                } else {
                  // Fallback: store original URL (will be handled by existing photo serving logic)
                  memberData.photoId = photoValue;
                  console.log(`[Import] Failed to download image, storing original URL for member ${memberData.membershipId}: ${photoValue}`);
                }
              } else {
                // Not an external URL, use as-is (local file, ID, etc.)
                memberData.photoId = photoValue;
                console.log(`[Import] Using photo ID as-is for member ${memberData.membershipId}: ${photoValue}`);
              }
            }
          }
          
          // Validate required fields
          if (!memberData.membershipId) {
            throw new Error('Missing Membership ID');
          }
          
          if (!memberData.firstName || !memberData.lastName) {
            throw new Error('Missing First Name or Last Name');
          }
          
          // Vérifier si l'ID existe dans un membre actif
          const isActiveDuplicate = existingMemberIds.has(memberData.membershipId);
          
          // Vérifier si l'ID existe dans un membre supprimé
          const isDeletedDuplicate = !isActiveDuplicate && allMembershipIds.has(memberData.membershipId);
          
          // Additional duplication checks
          let duplicateEmail = false;
          let duplicatePhone = false;
          
          if (memberData.email && existingEmails.has(memberData.email.toLowerCase())) {
            duplicateEmail = true;
          }
          
          if (memberData.phone && existingPhones.has(memberData.phone)) {
            duplicatePhone = true;
          }
          
          if (isActiveDuplicate) {
            // Le membre existe et est actif
            if (importMode === 'update') {
              // Update existing member
              try {
                const existingMember = existingMembers.find(m => m.membershipId === memberData.membershipId);
                if (existingMember) {
                  // Update member
                  const updatedMember = await storage.updateMember(existingMember.id, memberData);
                  
                  if (updatedMember) {
                    result.success++;
                    result.successfulMembers.push({
                      firstName: updatedMember.firstName,
                      lastName: updatedMember.lastName,
                      membershipId: updatedMember.membershipId,
                      federation: updatedMember.federation || ""
                    });
                  }
                  
                  // Add to tracking sets to prevent double imports
                  if (memberData.email) existingEmails.add(memberData.email.toLowerCase());
                  if (memberData.phone) existingPhones.add(memberData.phone);
                }
              } catch (error) {
                console.error(`Error updating member in row ${rowIndex}:`, error);
                throw new Error(`Failed to update member: ${(error as Error).message}`);
              }
            } else {
              // Skip this member (importMode === 'skip')
              result.skipped++;
              result.skippedMembers.push({
                row: rowIndex,
                reason: 'Member ID already exists',
                data: memberData
              });
            }
          } else if (isDeletedDuplicate) {
            // Le membre existe mais est marqué comme supprimé
            try {
              // Trouver le membre supprimé
              const deletedMember = allMembersIncludingDeleted.find(
                (m: Member) => m.membershipId === memberData.membershipId && m.deleted
              );
              
              if (deletedMember) {
                console.log(`Reactivating deleted member with ID: ${memberData.membershipId}`);
                
                // Mettre à jour le membre avec les nouvelles données et le réactiver
                const reactivatedMember = await storage.updateMember(deletedMember.id, {
                  ...memberData,
                  deleted: false, 
                  deletedAt: null
                });
                
                if (reactivatedMember) {
                  result.success++;
                  result.successfulMembers.push({
                    firstName: reactivatedMember.firstName,
                    lastName: reactivatedMember.lastName,
                    membershipId: reactivatedMember.membershipId,
                    federation: reactivatedMember.federation || ""
                  });
                  
                  // Ajouter aux ensembles de suivi pour éviter les doublons
                  existingMemberIds.add(reactivatedMember.membershipId);
                  if (reactivatedMember.email) existingEmails.add(reactivatedMember.email.toLowerCase());
                  if (reactivatedMember.phone) existingPhones.add(reactivatedMember.phone);
                } else {
                  throw new Error('Failed to reactivate deleted member');
                }
              } else {
                throw new Error('Deleted member found in database but could not be retrieved');
              }
            } catch (error) {
              console.error(`Error reactivating deleted member in row ${rowIndex}:`, error);
              throw new Error(`Failed to reactivate deleted member: ${(error as Error).message}`);
            }
          } else if (duplicateEmail) {
            // Skip due to duplicate email
            result.skipped++;
            result.skippedMembers.push({
              row: rowIndex,
              reason: 'Email already exists',
              data: memberData
            });
          } else if (duplicatePhone) {
            // Skip due to duplicate phone
            result.skipped++;
            result.skippedMembers.push({
              row: rowIndex,
              reason: 'Phone number already exists',
              data: memberData
            });
          } else {
            // Create new member
            try {
              const newMember = await storage.createMember(memberData);
              
              result.success++;
              result.successfulMembers.push({
                firstName: newMember.firstName,
                lastName: newMember.lastName,
                membershipId: newMember.membershipId,
                federation: newMember.federation
              });
              
              // Add to tracking sets to prevent double imports within the same file
              existingMemberIds.add(newMember.membershipId);
              if (newMember.email) existingEmails.add(newMember.email.toLowerCase());
              if (newMember.phone) existingPhones.add(newMember.phone);
            } catch (error) {
              console.error(`Error creating member in row ${rowIndex}:`, error);
              throw new Error(`Failed to create member: ${(error as Error).message}`);
            }
          }
        } catch (error) {
          // Record failed import
          result.failed++;
          result.failedMembers.push({
            row: rowIndex,
            reason: (error as Error).message || 'Unknown error',
            data: row
          });
        }
      }
      
      // Clean up the file
      fs.unlinkSync(filePath);
      
      // Calculate duration
      result.duration = Date.now() - startTime;
      
      return res.json(result);
    } catch (error) {
      console.error('Error importing members:', error);
      
      // Clean up the file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(500).json({
        error: 'Failed to import members',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
    }
  });

  return router;
}