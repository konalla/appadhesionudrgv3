declare module 'pdfkit';
declare module 'qrcode';

// Common interface for Member across the application
interface Member {
  id: number;
  firstName: string;
  lastName: string;
  membershipId?: string;
  federation?: string;
  section?: string;
  gender?: string;
  photoId?: string | null;
  email?: string | null;
  pendingApproval?: boolean;
  hasVoterCard?: string;
  registrationDate: string | Date;
  phone?: string;
  [key: string]: any; // Allow any additional properties
}