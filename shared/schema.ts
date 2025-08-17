import { pgTable, text, serial, integer, boolean, timestamp, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication and admin users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"), // Made optional for enrollment agents
  phone: text("phone"),
  address: text("address"),
  photoId: text("photo_id"),
  role: text("role").notNull().default("admin"), // "sysadmin" or "admin"
  sectionId: integer("section_id"), // Section assignment for enrollment agents
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  photoId: true,
  role: true,
  sectionId: true,
});

// Member schema with all required fields
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  membershipId: text("membership_id").notNull().unique(), // 8-digit unique ID
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender").notNull(),
  birthDate: text("birth_date"),
  birthPlace: text("birth_place").notNull(), // Birth location added
  email: text("email"), // Optional email
  phone: text("phone"),
  country: text("country").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  education: text("education"),
  educationOther: text("education_other"),  // Champ pour préciser la formation si "other" est sélectionné
  occupation: text("occupation"), // Made optional
  regionId: integer("region_id"), // Reference à la région (optionnel)
  federationId: integer("federation_id"), // Reference à la fédération (optional)
  sectionId: integer("section_id"), // Reference à la section (optionnel)
  federation: text("federation"), // Nom de la fédération (optional)
  section: text("section"), // Nom de la section (gardé pour compatibilité)
  hasVoterCard: text("has_voter_card"), // Optional voter card status
  voterCardNumber: text("voter_card_number"),
  photoId: text("photo_id").notNull(),
  registeredById: integer("registered_by_id"), // User ID of the admin who registered this member
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
  expirationDate: timestamp("expiration_date"), // 5 years from registration date
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Dernière modification
  pendingApproval: boolean("pending_approval").notNull().default(false),
  deleted: boolean("deleted").notNull().default(false), // Flag pour marquer un membre comme supprimé
  deletedAt: timestamp("deleted_at"), // Date de suppression
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  membershipId: true, // Auto-generated, not user input
  registrationDate: true,
  updatedAt: true, // Auto-managed by server
  deleted: true, // Auto-managed by server
  deletedAt: true, // Auto-managed by server
}).partial({
  pendingApproval: true, // Make it optional so server can set it
  expirationDate: true, // Make it optional to avoid validation issues
});

// Note: Le schéma memberFormSchema défini plus loin dans ce fichier inclut déjà la validation
// pour accepter les IDs d'images temporaires (temp_img_)

// Federation schema - Second level in hierarchy (Region > Federation > Section)
export const federations = pgTable("federations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),              // Nom en français (principal)
  name_en: text("name_en"),                  // Nom en anglais (optionnel)
  regionId: integer("region_id").notNull(),  // Lien vers la région parente
  country: text("country").notNull(),        // Pays en français
  country_en: text("country_en"),            // Pays en anglais (optionnel)
  description: text("description"),          // Description ou notes additionnelles
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFederationSchema = createInsertSchema(federations).omit({
  id: true,
  createdAt: true,
});

// Statistics schema for caching dashboard data
export const statistics = pgTable("statistics", {
  id: serial("id").primaryKey(),
  totalMembers: integer("total_members").notNull(),
  membersByGender: json("members_by_gender").notNull(),
  membersByRegion: json("members_by_region").notNull(),
  membersByAge: json("members_by_age").notNull(),
  membersByVoterCard: json("members_by_voter_card").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertStatisticsSchema = createInsertSchema(statistics).omit({
  id: true,
  lastUpdated: true,
});

// Messages schema for admin messaging system
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

// Group messages schema for broadcasts to groups of members
export const groupMessages = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  targetType: text("target_type").notNull(), // "region", "federation", "gender", "voterCard", "all"
  targetValue: text("target_value").notNull(), // The specific value for the target type
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  recipientCount: integer("recipient_count").notNull(),
});

export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({
  id: true,
  createdAt: true,
  recipientCount: true,
});

// Regions schema - Top level geo-political division (continents, sub-continents, etc.)
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),              // Nom en français (principal), ex: "Afrique de l'Ouest"
  country: text("country"),                  // LEGACY: Pays (maintenu pour compatibilité)
  name_en: text("name_en"),                  // Nom en anglais (optionnel), ex: "West Africa"
  country_en: text("country_en"),            // LEGACY: Pays en anglais (maintenu pour compatibilité)
  description: text("description"),          // Description détaillée de la région géopolitique
  code: text("code"),                        // Code optionnel pour la région, ex: "WEAF"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
});

// Sections schema - Third level in hierarchy (Region > Federation > Section)
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),              // Nom en français (principal)
  name_en: text("name_en"),                  // Nom en anglais (optionnel)
  federationId: integer("federation_id").notNull(), // Lien vers la fédération parente
  description: text("description"),          // Description ou notes additionnelles
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSectionSchema = createInsertSchema(sections).omit({
  id: true,
  createdAt: true,
});

// Member Cards schema for generating member ID cards
export const memberCards = pgTable("member_cards", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(), // Reference to the member
  cardNumber: text("card_number").notNull().unique(), // Unique card number, auto-generated on server
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  expiryDate: date("expiry_date").notNull(), // When the card expires
  status: text("status").notNull().default("active"), // active, expired, revoked
  qrCodeData: text("qr_code_data").notNull(), // Data encoded in the QR code
  cardTemplate: text("card_template").notNull().default("standard"), // Template design to use
  printedCount: integer("printed_count").notNull().default(0), // Track number of prints
  lastPrintedAt: timestamp("last_printed_at"), // Last time the card was printed
  metadata: json("metadata"), // Additional custom fields
});

export const insertMemberCardSchema = createInsertSchema(memberCards).omit({
  id: true,
  issueDate: true,
  printedCount: true,
  lastPrintedAt: true,
}).partial({
  cardNumber: true, // Make cardNumber optional for inserts (will be auto-generated)
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type Federation = typeof federations.$inferSelect;
export type InsertFederation = z.infer<typeof insertFederationSchema>;

export type Statistics = typeof statistics.$inferSelect;
export type InsertStatistics = z.infer<typeof insertStatisticsSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type GroupMessage = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;

export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;

export type MemberCard = typeof memberCards.$inferSelect;
export type InsertMemberCard = z.infer<typeof insertMemberCardSchema>;

export type Section = typeof sections.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;

// Extended schema with validations for forms
// Define the base schema without interdependent validations and exclude problematic fields
// Note: insertMemberSchema already omits id, membershipId, registrationDate, updatedAt, deleted, deletedAt
const memberBaseSchema = insertMemberSchema
  .omit({
    expirationDate: true, // Exclude from form validation - server handles this
  })
  .extend({
    firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
    lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
    gender: z.enum(["male", "female"], { 
      errorMap: () => ({ message: "Please select a gender" })
    }),
    birthDate: z.string().optional().or(z.literal("")),
    birthPlace: z.string().min(2, { message: "Birth place is required" }),
    phone: z.string().optional().or(z.literal("")), 
    country: z.string().min(1, { message: "Country is required" }),
    city: z.string().min(1, { message: "City is required" }),
    occupation: z.string().optional().or(z.literal("")), // Made optional
    education: z.string().optional().or(z.literal("")), // Made optional
    educationOther: z.string().optional().or(z.literal("")), // Add educationOther field
    federation: z.string().min(1, { message: "Federation is required" }), // Federation is now required
    federationId: z.number({ required_error: "Federation ID is required" }),
    regionId: z.number().optional().nullable(),
    sectionId: z.number({ required_error: "Section ID is required" }),
    hasVoterCard: z.enum(["yes", "no", "processing"]).optional().or(z.literal("")).nullable(), // Voter card status is now optional
    voterCardNumber: z.string().optional().or(z.literal("")).nullable(),
    email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal("")),
    photoId: z.string().min(1, { message: "La photo du membre est obligatoire" })
      .refine(val => val && (
        val === "no_photo_available" || // Allow placeholder for existing members
        val.startsWith("http") || 
        val.startsWith("/uploads/") ||
        val.startsWith("temp_img_") || // Accepter les IDs temporaires d'images en mode hors ligne
        /\.(jpe?g|png|gif)$/i.test(val) ||
        /^[0-9a-f]{24}$/.test(val) || 
        val.startsWith("IMG_") ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|gif)$/i.test(val) || // UUID format with extension
        /^[0-9a-f\-]{36}\.(jpe?g|png|gif)$/i.test(val) || // UUID format with extension
        val.startsWith("imported_") || // Imported photos
        val.startsWith("import_") // Import photos with various formats
      ), {
        message: "Format de photo non valide"
      }),
  });

// Add the full schema with cross-field validation
export const memberFormSchema = memberBaseSchema
  .refine(
    (data) => {
      // If hasVoterCard is "yes", then voterCardNumber is required
      if (data.hasVoterCard === "yes") {
        return !!data.voterCardNumber;
      }
      return true;
    },
    {
      message: "Voter card number is required when you have a voter card",
      path: ["voterCardNumber"], // This targets the specific field for the error
    }
  )
  .refine(
    (data) => {
      // Si education est "other", alors educationOther est requis
      if (data.education === "other") {
        return !!data.educationOther;
      }
      return true;
    },
    {
      message: "Veuillez préciser votre formation",
      path: ["educationOther"], // Ce champ sera ciblé par l'erreur
    }
  );

// Stricter schema for new member registration - requires actual photo, not placeholder
export const newMemberFormSchema = memberFormSchema
  .refine(
    (data) => {
      // For new registrations, photoId cannot be the placeholder value
      return data.photoId !== "no_photo_available" && data.photoId !== "";
    },
    {
      message: "Une vraie photo du membre est obligatoire pour l'inscription",
      path: ["photoId"],
    }
  );

export const userFormSchema = insertUserSchema.extend({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal("")),
  phone: z.string().min(6, { message: "Phone number must be at least 6 characters" }).optional(),
  address: z.string().min(6, { message: "Address must be at least 6 characters" }).optional(),
  photoId: z.string().optional(),
  role: z.enum(["admin", "sysadmin", "system_admin"], { 
    errorMap: () => ({ message: "Please select a valid role" })
  }),
  sectionId: z.number().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const messageFormSchema = z.object({
  receiverId: z.number({ required_error: "Recipient is required" }),
  subject: z.string().min(2, { message: "Subject must be at least 2 characters" }),
  content: z.string().min(5, { message: "Message must be at least 5 characters" }),
});

export const groupMessageFormSchema = z.object({
  targetType: z.enum(["region", "federation", "gender", "voterCard", "all"], {
    required_error: "Target type is required",
    invalid_type_error: "Please select a valid target type"
  }),
  targetValue: z.string().min(1, { message: "Target value is required" }),
  subject: z.string().min(2, { message: "Subject must be at least 2 characters" }),
  content: z.string().min(5, { message: "Message must be at least 5 characters" }),
});

export const regionFormSchema = insertRegionSchema.extend({
  name: z.string().min(2, { message: "Region name (French) must be at least 2 characters" }),
  name_en: z.string().optional(),
  description: z.string().optional(),
  code: z.string().optional(),
});

export const federationFormSchema = insertFederationSchema.extend({
  name: z.string().min(2, { message: "Federation name (French) must be at least 2 characters" }),
  name_en: z.string().optional(),
  regionId: z.number({ required_error: "Region is required" }),
  country: z.string().min(2, { message: "Country name (French) must be at least 2 characters" }),
  country_en: z.string().optional(),
  description: z.string().optional(),
});

export const sectionFormSchema = insertSectionSchema.extend({
  name: z.string().min(2, { message: "Section name (French) must be at least 2 characters" }),
  name_en: z.string().optional(),
  federationId: z.number({ required_error: "Federation is required" }),
  description: z.string().optional(),
});

// Member card form schema
export const memberCardFormSchema = insertMemberCardSchema.extend({
  memberId: z.number({ required_error: "Member is required" }),
  cardNumber: z.string().min(4, { message: "Card number must be at least 4 characters" }).optional(),
  expiryDate: z.string().min(1, { message: "Expiry date is required" }),
  status: z.enum(["active", "expired", "revoked"], {
    required_error: "Status is required",
    invalid_type_error: "Please select a valid status"
  }),
  qrCodeData: z.string({ required_error: "QR code data is required" }),
  cardTemplate: z.string().default("standard"),
  metadata: z.any().optional(),
});

export type LoginData = z.infer<typeof loginSchema>;
export type MessageFormData = z.infer<typeof messageFormSchema>;
export type GroupMessageFormData = z.infer<typeof groupMessageFormSchema>;
export type RegionFormData = z.infer<typeof regionFormSchema>;
export type FederationFormData = z.infer<typeof federationFormSchema>;
export type SectionFormData = z.infer<typeof sectionFormSchema>;
export type MemberCardFormData = z.infer<typeof memberCardFormSchema>;
