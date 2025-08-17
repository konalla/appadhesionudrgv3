import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with original extension
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// File filter to only allow image files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    // Instead of silently rejecting the file, throw an error
    cb(new Error('Only image files are allowed'));
  }
};

// Configure multer with improved error handling
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1 // Allow only 1 file per request
  },
  fileFilter: fileFilter
});

// Get file URL for a given filename
export function getFileUrl(filename: string): string {
  // Return just the filename - the photo serving logic handles the uploads/ path internally
  return filename;
}

// Ensure file persistence by creating a backup copy
export function ensureFilePersistence(filename: string): void {
  try {
    const originalPath = path.join(UPLOADS_DIR, filename);
    const backupPath = path.join(UPLOADS_DIR, `backup_${filename}`);
    
    if (fs.existsSync(originalPath) && !fs.existsSync(backupPath)) {
      fs.copyFileSync(originalPath, backupPath);
      console.log(`Created backup for uploaded file: ${filename}`);
    }
  } catch (error) {
    console.warn(`Failed to create backup for ${filename}:`, error);
  }
}

/**
 * Télécharge une image à partir d'une URL et la sauvegarde dans le répertoire uploads
 * @param url URL de l'image à télécharger
 * @returns Nom du fichier sauvegardé
 */
export async function downloadImageFromUrl(url: string): Promise<string> {
  try {
    // Importer dynamiquement node-fetch
    const fetchModule = await import('node-fetch');
    const fetch = fetchModule.default;
    
    // Télécharger l'image
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    // Déterminer l'extension à partir du type de contenu ou de l'URL
    let extension = '.jpg'; // Extension par défaut
    
    // Si le Content-Type est disponible, l'utiliser pour l'extension
    const contentType = response.headers.get('content-type');
    if (contentType) {
      if (contentType.includes('png')) extension = '.png';
      else if (contentType.includes('gif')) extension = '.gif';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
    } else {
      // Sinon, essayer d'extraire l'extension de l'URL
      const urlExtension = url.split('.').pop()?.toLowerCase();
      if (urlExtension && ['jpg', 'jpeg', 'png', 'gif'].includes(urlExtension)) {
        extension = `.${urlExtension}`;
      }
    }
    
    // Générer un nom de fichier unique
    const filename = `${uuidv4()}${extension}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    
    // Créer le flux d'écriture
    const fileStream = fs.createWriteStream(filePath);
    
    // Convertir le corps de la réponse en buffer
    const buffer = await response.buffer();
    
    // Écrire le buffer dans le fichier
    fs.writeFileSync(filePath, buffer);
    
    console.log(`Image téléchargée avec succès: ${filename}`);
    return filename;
  } catch (error: any) {
    console.error('Erreur lors du téléchargement de l\'image:', error.message || error);
    throw new Error(`Erreur lors du téléchargement de l'image: ${error.message || 'Erreur inconnue'}`);
  }
}