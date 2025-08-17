import { members, type Member, type InsertMember, users, type User, type InsertUser, federations, type Federation, type InsertFederation, statistics, type Statistics, type InsertStatistics, messages, type Message, type InsertMessage, groupMessages, type GroupMessage, type InsertGroupMessage, regions, type Region, type InsertRegion, memberCards, type MemberCard, type InsertMemberCard, sections, type Section, type InsertSection } from "@shared/schema";

// Modify the interface with any CRUD methods you might need
export interface IStorage {
  // Users and Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Members
  getMember(id: number): Promise<Member | undefined>;
  getMemberByMembershipId(membershipId: string): Promise<Member | undefined>;
  getMemberByPhotoId(photoId: string): Promise<Member | undefined>;
  getAllMembers(): Promise<Member[]>;
  getAllMembersIncludingDeleted(): Promise<Member[]>; // Fonction pour récupérer tous les membres, y compris ceux supprimés
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, member: Partial<InsertMember>): Promise<Member | undefined>;
  deleteMember(id: number): Promise<boolean>;
  getFilteredMembers(filter: any): Promise<Member[]>;
  checkPotentialDuplicate(member: InsertMember): Promise<{ isDuplicate: boolean, matchingFields: number, isDuplicateByDefinition: boolean, similarMember?: Member }>;
  
  // Federations
  getFederation(id: number): Promise<Federation | undefined>;
  getAllFederations(): Promise<Federation[]>;
  createFederation(federation: InsertFederation): Promise<Federation>;
  updateFederation(id: number, federation: Partial<InsertFederation>): Promise<Federation | undefined>;
  deleteFederation(id: number): Promise<boolean>;
  
  // Statistics
  getStatistics(): Promise<Statistics | undefined>;
  updateStatistics(stats: InsertStatistics): Promise<Statistics | undefined>;
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getAllMessages(): Promise<Message[]>;
  getMessagesBySender(senderId: number): Promise<Message[]>;
  getMessagesByReceiver(receiverId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  deleteMessage(id: number): Promise<boolean>;
  getUnreadMessageCount(userId: number): Promise<number>;
  
  // Group Messages
  getGroupMessage(id: number): Promise<GroupMessage | undefined>;
  getGroupMessagesBySender(senderId: number): Promise<GroupMessage[]>;
  createGroupMessage(message: InsertGroupMessage, recipientCount: number): Promise<GroupMessage>;
  deleteGroupMessage(id: number): Promise<boolean>;
  
  // Regions
  getRegion(id: number): Promise<Region | undefined>;
  getRegionByName(name: string): Promise<Region | undefined>;
  getAllRegions(): Promise<Region[]>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(id: number, region: Partial<InsertRegion>): Promise<Region | undefined>;
  deleteRegion(id: number): Promise<boolean>;
  
  // Sections
  getSection(id: number): Promise<Section | undefined>;
  getSectionsByFederation(federationId: number): Promise<Section[]>;
  getAllSections(): Promise<Section[]>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: number, section: Partial<InsertSection>): Promise<Section | undefined>;
  deleteSection(id: number): Promise<boolean>;
  
  // Member Cards
  getMemberCard(id: number): Promise<MemberCard | undefined>;
  getMemberCardByCardNumber(cardNumber: string): Promise<MemberCard | undefined>;
  getMemberCardsByMemberId(memberId: number): Promise<MemberCard[]>;
  createMemberCard(card: InsertMemberCard): Promise<MemberCard>;
  updateMemberCard(id: number, card: Partial<InsertMemberCard>): Promise<MemberCard | undefined>;
  deleteMemberCard(id: number): Promise<boolean>;
  getAllMemberCards(): Promise<MemberCard[]>;
  incrementPrintCount(id: number): Promise<MemberCard | undefined>;
  
  // Data synchronization methods
  synchronizeMemberSectionNames(): Promise<{ updatedCount: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private members: Map<number, Member>;
  private federations: Map<number, Federation>;
  private messages: Map<number, Message>;
  private groupMessages: Map<number, GroupMessage>;
  private regions: Map<number, Region>;
  private memberCardsMap: Map<number, MemberCard>;
  private sectionsMap: Map<number, Section>;
  private stats: Statistics | undefined;
  
  private userCurrentId: number;
  private memberCurrentId: number;
  private federationCurrentId: number;
  private messageCurrentId: number;
  private groupMessageCurrentId: number;
  private regionCurrentId: number;
  private memberCardCurrentId: number;
  private sectionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.members = new Map();
    this.federations = new Map();
    this.messages = new Map();
    this.groupMessages = new Map();
    this.regions = new Map();
    this.memberCardsMap = new Map();
    this.sectionsMap = new Map();
    
    this.userCurrentId = 1;
    this.memberCurrentId = 1;
    this.federationCurrentId = 1;
    this.messageCurrentId = 1;
    this.groupMessageCurrentId = 1;
    this.regionCurrentId = 1;
    this.memberCardCurrentId = 1;
    this.sectionCurrentId = 1;
    
    // Initialize with default admin user
    this.createUser({
      username: "admin",
      password: "password",
      name: "System Admin",
      email: "admin@udrg.org",
      role: "sysadmin"
    });
    
    // Créer un 2e utilisateur (admin) pour tester les messages
    this.createUser({
      username: "maria",
      password: "password",
      name: "Maria Camara",
      email: "maria@udrg.org",
      role: "admin"
    });
    
    // Initialize with default federations
    // Récupérer d'abord les IDs des régions pour les liens
    const regionConakry = this.regions.get(1); // Assuming region IDs start at 1
    const regionLowerGuinea = this.regions.get(2);
    const regionUpperGuinea = this.regions.get(3);
    const regionMiddleGuinea = this.regions.get(4);
    const regionForestGuinea = this.regions.get(5);
    
    if (regionConakry && regionLowerGuinea && regionUpperGuinea && regionMiddleGuinea && regionForestGuinea) {
      const defaultFederations = [
        { name: "Conakry Central", regionId: regionConakry.id, country: "Guinea" },
        { name: "Conakry North", regionId: regionConakry.id, country: "Guinea" },
        { name: "Conakry South", regionId: regionConakry.id, country: "Guinea" },
        { name: "Kindia East", regionId: regionLowerGuinea.id, country: "Guinea" },
        { name: "Kindia West", regionId: regionLowerGuinea.id, country: "Guinea" },
        { name: "Boké Central", regionId: regionLowerGuinea.id, country: "Guinea" },
        { name: "Kankan Region", regionId: regionUpperGuinea.id, country: "Guinea" },
        { name: "Labé Region", regionId: regionMiddleGuinea.id, country: "Guinea" },
        { name: "Nzérékoré Region", regionId: regionForestGuinea.id, country: "Guinea" }
      ];
      
      defaultFederations.forEach(fed => {
        this.createFederation(fed);
      });
    }
    
    // Add 5 test members
    const defaultMembers = [
      {
        firstName: "Mamadou",
        lastName: "Diallo",
        gender: "male",
        birthDate: "1985-05-15",
        birthPlace: "Conakry",
        phone: "224661234567",
        occupation: "Teacher",
        education: "University",
        country: "Guinea",
        city: "Conakry",
        federation: "Conakry Central",
        hasVoterCard: "yes",
        voterCardNumber: "VC12345678",
        pendingApproval: false
      },
      {
        firstName: "Fatoumata",
        lastName: "Camara",
        gender: "female",
        birthDate: "1990-09-20",
        birthPlace: "Kankan",
        phone: "224662345678",
        occupation: "Doctor",
        education: "Medical School",
        country: "Guinea",
        city: "Kankan",
        federation: "Kankan Region",
        hasVoterCard: "yes",
        voterCardNumber: "VC23456789",
        pendingApproval: false
      },
      {
        firstName: "Thierno",
        lastName: "Barry",
        gender: "male",
        birthDate: "1978-11-10",
        birthPlace: "Labé",
        phone: "224663456789",
        occupation: "Businessman",
        education: "High School",
        country: "Guinea",
        city: "Labé",
        federation: "Labé Region",
        hasVoterCard: "no",
        pendingApproval: false
      },
      {
        firstName: "Aissatou",
        lastName: "Bah",
        gender: "female",
        birthDate: "1995-03-25",
        birthPlace: "Nzérékoré",
        phone: "224664567890",
        occupation: "Student",
        education: "University",
        country: "Guinea",
        city: "Nzérékoré",
        federation: "Nzérékoré Region",
        hasVoterCard: "processing",
        pendingApproval: false
      },
      {
        firstName: "Ousmane",
        lastName: "Sow",
        gender: "male",
        birthDate: "1982-07-18",
        birthPlace: "Kindia",
        phone: "224665678901",
        occupation: "Engineer",
        education: "University",
        country: "Guinea",
        city: "Kindia",
        federation: "Kindia East",
        hasVoterCard: "yes",
        voterCardNumber: "VC34567890",
        pendingApproval: false
      }
    ];
    
    defaultMembers.forEach(member => {
      this.createMember(member);
    });

    // Créer des messages de test directement
    this.createMessage({
      senderId: 2, // Maria (ID = 2)
      receiverId: 1, // Admin (ID = 1)
      subject: "Bienvenue sur la plateforme",
      content: "Bonjour Admin,\n\nBienvenue sur notre plateforme de gestion des membres. N'hésitez pas à me contacter si vous avez des questions.\n\nCordialement,\nMaria"
    });
    
    this.createMessage({
      senderId: 1, // Admin (ID = 1)  
      receiverId: 2, // Maria (ID = 2)
      subject: "Question sur le système",
      content: "Bonjour Maria,\n\nMerci pour votre accueil. J'ai une question concernant les statistiques, comment sont-elles calculées?\n\nCordialement,\nAdmin"
    });
    
    // Ajout d'un troisième message pour tester
    this.createMessage({
      senderId: 2, // Maria (ID = 2)
      receiverId: 1, // Admin (ID = 1)
      subject: "Réponse à votre question",
      content: "Bonjour Admin,\n\nLes statistiques sont calculées automatiquement en fonction des données des membres enregistrés. Elles sont mises à jour à chaque ajout, modification ou suppression d'un membre.\n\nCordialement,\nMaria"
    });
    
    // Initialize with default regions
    const defaultRegions = [
      { name: "Conakry", country: "Guinea", description: "La capitale et la plus grande ville de Guinée" },
      { name: "Lower Guinea", country: "Guinea", description: "Région côtière de la Guinée" },
      { name: "Upper Guinea", country: "Guinea", description: "Région du nord-est de la Guinée" },
      { name: "Middle Guinea", country: "Guinea", description: "Région montagneuse centrale de la Guinée" },
      { name: "Forest Guinea", country: "Guinea", description: "Région forestière du sud-est de la Guinée" }
    ];
    
    defaultRegions.forEach(region => {
      this.createRegion(region);
    });
    
    // Créer un message de groupe de test
    this.createGroupMessage({
      senderId: 1, // Admin (ID = 1)
      targetType: "all",
      targetValue: "all",
      subject: "Bienvenue à tous les membres",
      content: "Bonjour à tous les membres de l'UDRG,\n\nNous sommes heureux de vous accueillir sur notre nouvelle plateforme de gestion des membres. N'hésitez pas à mettre à jour vos informations et à nous contacter si vous avez des questions.\n\nCordialement,\nL'équipe d'administration"
    }, 5); // 5 membres dans notre test
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const createdAt = new Date();
    // Ensure role is never undefined, default to "admin" if not specified
    const role = insertUser.role || "admin";
    const phone = insertUser.phone ?? null;
    const address = insertUser.address ?? null;
    const photoId = insertUser.photoId ?? null;
    const email = insertUser.email ?? null;
    const sectionId = insertUser.sectionId ?? null;
    
    const user: User = { 
      id, 
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name,
      email,
      phone,
      address,
      photoId,
      role, 
      sectionId,
      createdAt
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser: User = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Member methods
  async getMember(id: number): Promise<Member | undefined> {
    return this.members.get(id);
  }
  
  async getMemberByMembershipId(membershipId: string): Promise<Member | undefined> {
    return Array.from(this.members.values()).find(
      (member) => member.membershipId === membershipId
    );
  }

  async getMemberByPhotoId(photoId: string): Promise<Member | undefined> {
    return Array.from(this.members.values()).find(
      (member) => member.photoId === photoId
    );
  }
  
  async getAllMembers(): Promise<Member[]> {
    // Filter out deleted members
    return Array.from(this.members.values())
      .filter(member => !member.deleted);
  }
  
  async getAllMembersIncludingDeleted(): Promise<Member[]> {
    // Return all members including deleted ones
    return Array.from(this.members.values());
  }
  
  // Generate a unique 8-digit membership ID
  private generateMembershipId(): string {
    // Current timestamp + random 3-digit number for uniqueness
    const timestamp = Date.now().toString().slice(-5);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return timestamp + random;
  }
  
  // Check if a member might be a duplicate based on specified criteria
  // NEW CRITERIA: Last name, First name, Date of birth, Federation, Section
  async checkPotentialDuplicate(member: InsertMember): Promise<{ isDuplicate: boolean, matchingFields: number, isDuplicateByDefinition: boolean, similarMember?: Member }> {
    const members = await this.getAllMembers();
    let maxMatches = 0;
    let mostSimilarMember: Member | undefined;
    let strictDuplicate = false;
    
    for (const existingMember of members) {
      let matches = 0;
      
      // Compare fields for duplicates based on new criteria
      const firstNameMatch = existingMember.firstName.toLowerCase() === member.firstName.toLowerCase();
      const lastNameMatch = existingMember.lastName.toLowerCase() === member.lastName.toLowerCase();
      const birthDateMatch = existingMember.birthDate === member.birthDate;
      
      // Federation match - check both federation name and federationId
      const federationMatch = (
        (existingMember.federation && member.federation && 
         existingMember.federation.toLowerCase() === member.federation.toLowerCase()) ||
        (existingMember.federationId && member.federationId && 
         existingMember.federationId === member.federationId)
      );
      
      // Section match - check both section name and sectionId
      const sectionMatch = (
        (existingMember.section && member.section && 
         existingMember.section.toLowerCase() === member.section.toLowerCase()) ||
        (existingMember.sectionId && member.sectionId && 
         existingMember.sectionId === member.sectionId)
      );
          
      // Count matches based on new duplicate criteria
      if (firstNameMatch) matches++;
      if (lastNameMatch) matches++;
      if (birthDateMatch) matches++;
      if (federationMatch) matches++;
      if (sectionMatch) matches++;
      
      // Check strict duplicate definition: same last name, first name, date of birth, federation, and section
      if (firstNameMatch && lastNameMatch && birthDateMatch && federationMatch && sectionMatch) {
        strictDuplicate = true;
        mostSimilarMember = existingMember;
        maxMatches = 5; // All 5 criteria match
        break; // No need to continue checking
      }
      
      // Keep track of the most similar member
      if (matches > maxMatches) {
        maxMatches = matches;
        mostSimilarMember = existingMember;
      }
    }
    
    // Return duplicate status - now requiring more matches for potential duplicate flag
    return {
      isDuplicate: maxMatches >= 4, // At least 4 out of 5 criteria must match for potential duplicate
      matchingFields: maxMatches,
      isDuplicateByDefinition: strictDuplicate, // All 5 criteria match = strict duplicate
      similarMember: maxMatches >= 3 ? mostSimilarMember : undefined // Show similar member if at least 3 criteria match
    };
  }
  
  async createMember(insertMember: InsertMember): Promise<Member> {
    const id = this.memberCurrentId++;
    const registrationDate = new Date();
    
    // Calculate expiration date (5 years from registration)
    const expirationDate = new Date(registrationDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 5);
    
    // Generate a unique 8-digit membership ID
    const membershipId = this.generateMembershipId();
    
    // Ensure email is null if it's empty or undefined
    const email = insertMember.email === "" || insertMember.email === undefined ? null : insertMember.email;
    
    // Ensure address, education, voterCardNumber are null if empty or undefined
    const address = insertMember.address === "" || insertMember.address === undefined ? null : insertMember.address;
    const education = insertMember.education === "" || insertMember.education === undefined ? null : insertMember.education;
    const educationOther = insertMember.educationOther === "" || insertMember.educationOther === undefined ? null : insertMember.educationOther;
    const photoId = insertMember.photoId === "" || insertMember.photoId === undefined ? null : insertMember.photoId;
    const voterCardNumber = insertMember.voterCardNumber === "" || insertMember.voterCardNumber === undefined ? null : insertMember.voterCardNumber;
    const registeredById = insertMember.registeredById ?? null;
    
    // Ensure regionId is null if empty or undefined
    const regionId = insertMember.regionId ?? null;
    const sectionId = insertMember.sectionId ?? null;
    
    const section = insertMember.section ?? null;
    const member: Member = { 
      id, 
      membershipId,
      firstName: insertMember.firstName,
      lastName: insertMember.lastName,
      birthDate: insertMember.birthDate ?? null,
      birthPlace: insertMember.birthPlace ?? null,
      gender: insertMember.gender,
      email,
      phone: insertMember.phone ?? null,
      address,
      occupation: insertMember.occupation ?? null,
      federation: insertMember.federation ?? null,
      section,
      city: insertMember.city ?? null,
      country: insertMember.country ?? null,
      education,
      educationOther,
      photoId,
      voterCardNumber,
      hasVoterCard: insertMember.hasVoterCard ?? null,
      registrationDate,
      expirationDate,
      updatedAt: registrationDate, // Set initial updatedAt to registration date
      registeredById,
      regionId,
      sectionId,
      pendingApproval: insertMember.pendingApproval || false, // Respect the pendingApproval value if provided
      federationId: insertMember.federationId ?? null,
      deleted: false,
      deletedAt: null
    };
    
    this.members.set(id, member);
    
    // Update statistics after adding a new member
    this.updateMemberStatistics();
    
    return member;
  }
  
  async updateMember(id: number, memberData: Partial<InsertMember>): Promise<Member | undefined> {
    const existingMember = this.members.get(id);
    if (!existingMember) return undefined;
    
    // Handle optional fields to ensure they're null if empty
    if (memberData.email !== undefined) {
      memberData.email = memberData.email === "" ? null : memberData.email;
    }
    
    if (memberData.address !== undefined) {
      memberData.address = memberData.address === "" ? null : memberData.address;
    }
    
    if (memberData.education !== undefined) {
      memberData.education = memberData.education === "" ? null : memberData.education;
    }
    
    if (memberData.educationOther !== undefined) {
      memberData.educationOther = memberData.educationOther === "" ? null : memberData.educationOther;
    }
    
    if (memberData.photoId !== undefined) {
      memberData.photoId = memberData.photoId === "" ? null : memberData.photoId;
    }
    
    if (memberData.voterCardNumber !== undefined) {
      memberData.voterCardNumber = memberData.voterCardNumber === "" ? null : memberData.voterCardNumber;
    }
    
    // Set updatedAt to current timestamp
    const updateData = {
      ...memberData,
      updatedAt: new Date()
    };
    
    const updatedMember: Member = { ...existingMember, ...updateData };
    this.members.set(id, updatedMember);
    
    // Update statistics after updating a member
    this.updateMemberStatistics();
    
    return updatedMember;
  }
  
  async deleteMember(id: number): Promise<boolean> {
    // Récupérer et supprimer les cartes du membre
    const memberCards = await this.getMemberCardsByMemberId(id);
    for (const card of memberCards) {
      await this.deleteMemberCard(card.id);
    }
    
    const deleted = this.members.delete(id);
    
    // Update statistics after deleting a member
    if (deleted) {
      this.updateMemberStatistics();
    }
    
    return deleted;
  }
  
  async getFilteredMembers(filter: any): Promise<Member[]> {
    let members = Array.from(this.members.values());
    
    // Apply filters if available
    if (filter.federation && filter.federation !== 'all') {
      members = members.filter(m => m.federation === filter.federation);
    }
    
    if (filter.country && filter.country !== 'all') {
      members = members.filter(m => m.country === filter.country);
    }
    
    if (filter.hasVoterCard && filter.hasVoterCard !== 'all') {
      members = members.filter(m => m.hasVoterCard === filter.hasVoterCard);
    }
    
    // Filter by pending approval status
    if (filter.pendingApproval === 'true') {
      members = members.filter(m => m.pendingApproval === true);
    } else if (filter.pendingApproval === 'false') {
      members = members.filter(m => m.pendingApproval === false);
    }
    
    if (filter.startDate && filter.endDate) {
      const start = new Date(filter.startDate).getTime();
      const end = new Date(filter.endDate).getTime();
      members = members.filter(m => {
        const regDate = new Date(m.registrationDate).getTime();
        return regDate >= start && regDate <= end;
      });
    }
    
    if (filter.search) {
      const search = filter.search.toLowerCase();
      members = members.filter(m => 
        m.firstName.toLowerCase().includes(search) || 
        m.lastName.toLowerCase().includes(search) || 
        (m.phone && m.phone.includes(search)) || 
        (m.email && m.email.toLowerCase().includes(search))
      );
    }
    
    return members;
  }

  // Federation methods
  async getFederation(id: number): Promise<Federation | undefined> {
    return this.federations.get(id);
  }
  
  async getAllFederations(): Promise<Federation[]> {
    return Array.from(this.federations.values());
  }
  
  async createFederation(insertFederation: InsertFederation): Promise<Federation> {
    const id = this.federationCurrentId++;
    const createdAt = new Date();
    
    // Explicitly set optional fields to null if they're undefined
    const federation: Federation = {
      id,
      name: insertFederation.name,
      name_en: insertFederation.name_en || null,
      regionId: insertFederation.regionId,
      description: insertFederation.description || null,
      country: insertFederation.country,
      country_en: insertFederation.country_en || null,
      createdAt
    };
    
    this.federations.set(id, federation);
    return federation;
  }
  
  async updateFederation(id: number, federationData: Partial<InsertFederation>): Promise<Federation | undefined> {
    const existingFederation = this.federations.get(id);
    if (!existingFederation) return undefined;
    
    const updatedFederation: Federation = { ...existingFederation, ...federationData };
    this.federations.set(id, updatedFederation);
    return updatedFederation;
  }
  
  async deleteFederation(id: number): Promise<boolean> {
    // Check if federation is in use by any members
    const members = Array.from(this.members.values());
    const isInUse = members.some(member => {
      if (member.federation) {
        const federation = this.getFederationByName(member.federation);
        return federation?.id === id;
      }
      return false;
    });
    
    // Don't delete if federation is in use
    if (isInUse) {
      return false;
    }
    
    return this.federations.delete(id);
  }

  // Statistics methods
  async getStatistics(): Promise<Statistics | undefined> {
    if (!this.stats) {
      await this.updateMemberStatistics();
    }
    return this.stats;
  }
  
  async updateStatistics(statsData: InsertStatistics): Promise<Statistics | undefined> {
    const lastUpdated = new Date();
    this.stats = { id: 1, ...statsData, lastUpdated };
    return this.stats;
  }
  
  // Helper method to calculate and update statistics
  private async updateMemberStatistics() {
    const members = Array.from(this.members.values());
    const total = members.length;
    
    // Gender statistics
    const maleCount = members.filter(m => m.gender === 'male').length;
    const femaleCount = members.filter(m => m.gender === 'female').length;
    const otherCount = members.filter(m => m.gender === 'other').length;
    
    const membersByGender = {
      male: maleCount,
      female: femaleCount,
      other: otherCount
    };
    
    // Region statistics
    const regions = new Map<string, number>();
    members.forEach(m => {
      if (m.federation) {
        const fed = this.getFederationByName(m.federation);
        if (fed) {
          // Get the region name using the regionId from federation
          const regionObj = this.regions.get(fed.regionId);
          const regionName = regionObj?.name || 'Unknown';
          regions.set(regionName, (regions.get(regionName) || 0) + 1);
        } else {
          regions.set('Unknown', (regions.get('Unknown') || 0) + 1);
        }
      } else {
        regions.set('Unknown', (regions.get('Unknown') || 0) + 1);
      }
    });
    
    const membersByRegion = Object.fromEntries(regions.entries());
    
    // Age statistics
    const ageGroups = {
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55-64': 0,
      '65+': 0
    };
    
    const currentYear = new Date().getFullYear();
    
    members.forEach(m => {
      if (m.birthDate) {
        const birthYear = new Date(m.birthDate).getFullYear();
        const age = currentYear - birthYear;
      
        if (age < 25) ageGroups['18-24']++;
        else if (age < 35) ageGroups['25-34']++;
        else if (age < 45) ageGroups['35-44']++;
        else if (age < 55) ageGroups['45-54']++;
        else if (age < 65) ageGroups['55-64']++;
        else ageGroups['65+']++;
      }
    });
    
    const membersByAge = ageGroups;
    
    // Voter card statistics
    const yesCount = members.filter(m => m.hasVoterCard === 'yes').length;
    const noCount = members.filter(m => m.hasVoterCard === 'no').length;
    const processingCount = members.filter(m => m.hasVoterCard === 'processing').length;
    
    const membersByVoterCard = {
      yes: yesCount,
      no: noCount,
      processing: processingCount
    };
    
    // Update statistics
    await this.updateStatistics({
      totalMembers: total,
      membersByGender,
      membersByRegion,
      membersByAge,
      membersByVoterCard
    });
  }
  
  // Helper to get federation by name
  private getFederationByName(name: string): Federation | undefined {
    return Array.from(this.federations.values()).find(
      (fed) => fed.name === name
    );
  }
  
  // Region methods
  async getRegion(id: number): Promise<Region | undefined> {
    return this.regions.get(id);
  }
  
  async getRegionByName(name: string): Promise<Region | undefined> {
    return Array.from(this.regions.values()).find(
      (region) => region.name.toLowerCase() === name.toLowerCase()
    );
  }
  
  async getAllRegions(): Promise<Region[]> {
    return Array.from(this.regions.values());
  }
  
  async createRegion(insertRegion: InsertRegion): Promise<Region> {
    const id = this.regionCurrentId++;
    const createdAt = new Date();
    
    // Explicitly set optional fields to null if they're undefined
    const region: Region = {
      id,
      name: insertRegion.name,
      name_en: insertRegion.name_en || null,
      country: insertRegion.country || null,
      country_en: insertRegion.country_en || null,
      description: insertRegion.description || null,
      code: insertRegion.code || null,
      createdAt
    };
    
    this.regions.set(id, region);
    return region;
  }
  
  async updateRegion(id: number, regionData: Partial<InsertRegion>): Promise<Region | undefined> {
    const existingRegion = this.regions.get(id);
    if (!existingRegion) return undefined;
    
    const updatedRegion: Region = { ...existingRegion, ...regionData };
    this.regions.set(id, updatedRegion);
    return updatedRegion;
  }
  
  async deleteRegion(id: number): Promise<boolean> {
    // Check if region is in use by any federations
    const federations = Array.from(this.federations.values());
    const isInUse = federations.some(federation => federation.regionId === id);
    
    // Don't delete if region is in use
    if (isInUse) {
      return false;
    }
    
    return this.regions.delete(id);
  }
  
  // Section methods
  async getSection(id: number): Promise<Section | undefined> {
    return this.sectionsMap.get(id);
  }
  
  async getSectionsByFederation(federationId: number): Promise<Section[]> {
    return Array.from(this.sectionsMap.values()).filter(
      section => section.federationId === federationId
    );
  }
  
  async getAllSections(): Promise<Section[]> {
    return Array.from(this.sectionsMap.values());
  }
  
  async createSection(sectionData: InsertSection): Promise<Section> {
    const id = this.sectionCurrentId++;
    const createdAt = new Date();
    
    // Vérifier si la fédération existe
    const federation = await this.getFederation(sectionData.federationId);
    if (!federation) {
      throw new Error(`Federation with ID ${sectionData.federationId} does not exist`);
    }
    
    // Gérer les champs optionnels
    const name_en = sectionData.name_en ?? null;
    const description = sectionData.description ?? null;
    
    const section: Section = {
      id,
      name: sectionData.name,
      federationId: sectionData.federationId,
      name_en,
      description,
      createdAt
    };
    
    this.sectionsMap.set(id, section);
    return section;
  }
  
  async updateSection(id: number, sectionData: Partial<InsertSection>): Promise<Section | undefined> {
    const existingSection = this.sectionsMap.get(id);
    if (!existingSection) return undefined;
    
    // Si federationId est modifié, vérifier que la nouvelle fédération existe
    if (sectionData.federationId && sectionData.federationId !== existingSection.federationId) {
      const federation = await this.getFederation(sectionData.federationId);
      if (!federation) {
        throw new Error(`Federation with ID ${sectionData.federationId} does not exist`);
      }
    }
    
    const updatedSection: Section = { ...existingSection, ...sectionData };
    this.sectionsMap.set(id, updatedSection);
    return updatedSection;
  }
  
  async deleteSection(id: number): Promise<boolean> {
    // Vérifier si la section est utilisée par des membres
    const members = await this.getAllMembers();
    const isUsed = members.some(member => member.sectionId === id);
    
    if (isUsed) {
      throw new Error('Cannot delete section: it is used by one or more members');
    }
    
    return this.sectionsMap.delete(id);
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getAllMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async getMessagesBySender(senderId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (message) => message.senderId === senderId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getMessagesByReceiver(receiverId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (message) => message.receiverId === receiverId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const createdAt = new Date();
    const isRead = false;
    
    const message: Message = { ...insertMessage, id, isRead, createdAt };
    this.messages.set(id, message);
    return message;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage: Message = { ...message, isRead: true };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(id: number): Promise<boolean> {
    return this.messages.delete(id);
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    return Array.from(this.messages.values()).filter(
      (message) => message.receiverId === userId && !message.isRead
    ).length;
  }
  
  // Group Message methods
  async getGroupMessage(id: number): Promise<GroupMessage | undefined> {
    return this.groupMessages.get(id);
  }

  async getGroupMessagesBySender(senderId: number): Promise<GroupMessage[]> {
    return Array.from(this.groupMessages.values()).filter(
      (message) => message.senderId === senderId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createGroupMessage(insertGroupMessage: InsertGroupMessage, recipientCount: number): Promise<GroupMessage> {
    const id = this.groupMessageCurrentId++;
    const createdAt = new Date();
    
    const groupMessage: GroupMessage = { 
      ...insertGroupMessage, 
      id, 
      createdAt, 
      recipientCount 
    };
    
    this.groupMessages.set(id, groupMessage);
    return groupMessage;
  }

  async deleteGroupMessage(id: number): Promise<boolean> {
    return this.groupMessages.delete(id);
  }

  // Member Cards methods
  async getMemberCard(id: number): Promise<MemberCard | undefined> {
    return this.memberCardsMap.get(id);
  }

  async getMemberCardByCardNumber(cardNumber: string): Promise<MemberCard | undefined> {
    return Array.from(this.memberCardsMap.values()).find(
      (card) => card.cardNumber === cardNumber
    );
  }

  async getMemberCardsByMemberId(memberId: number): Promise<MemberCard[]> {
    return Array.from(this.memberCardsMap.values()).filter(
      (card) => card.memberId === memberId
    );
  }

  async getAllMemberCards(): Promise<MemberCard[]> {
    return Array.from(this.memberCardsMap.values());
  }

  // Generate a unique card number 
  private generateCardNumber(): string {
    // Format: UDRG-YYYY-XXXXX where YYYY is year and XXXXX is sequential number
    const year = new Date().getFullYear().toString();
    const sequence = this.memberCardCurrentId.toString().padStart(5, '0');
    return `UDRG-${year}-${sequence}`;
  }

  async createMemberCard(insertCard: InsertMemberCard): Promise<MemberCard> {
    const id = this.memberCardCurrentId++;
    const issueDate = new Date();
    const cardNumber = insertCard.cardNumber || this.generateCardNumber();
    
    const card: MemberCard = {
      ...insertCard,
      id,
      cardNumber,
      issueDate,
      status: insertCard.status || "active", // Ensure status has a default value
      cardTemplate: insertCard.cardTemplate || "standard", // Ensure cardTemplate has a default value
      printedCount: 0,
      lastPrintedAt: null,
      metadata: insertCard.metadata || {} // Ensure metadata has a default value
    };
    
    this.memberCardsMap.set(id, card);
    return card;
  }

  async updateMemberCard(id: number, cardData: Partial<InsertMemberCard>): Promise<MemberCard | undefined> {
    const existingCard = this.memberCardsMap.get(id);
    if (!existingCard) return undefined;
    
    const updatedCard: MemberCard = { ...existingCard, ...cardData };
    this.memberCardsMap.set(id, updatedCard);
    return updatedCard;
  }

  async incrementPrintCount(id: number): Promise<MemberCard | undefined> {
    const existingCard = this.memberCardsMap.get(id);
    if (!existingCard) return undefined;
    
    const updatedCard: MemberCard = { 
      ...existingCard,
      printedCount: existingCard.printedCount + 1,
      lastPrintedAt: new Date()
    };
    
    this.memberCardsMap.set(id, updatedCard);
    return updatedCard;
  }

  async deleteMemberCard(id: number): Promise<boolean> {
    return this.memberCardsMap.delete(id);
  }

  // Data synchronization methods
  async synchronizeMemberSectionNames(): Promise<{ updatedCount: number }> {
    let updatedCount = 0;
    
    // Get all members and sections
    const allMembers = Array.from(this.members.values());
    const allSections = Array.from(this.sectionsMap.values());
    const sectionMap = new Map(allSections.map(s => [s.id, s.name]));
    
    // Update each member whose section name doesn't match their sectionId
    for (const member of allMembers) {
      if (member.sectionId) {
        const correctSectionName = sectionMap.get(member.sectionId);
        if (correctSectionName && member.section !== correctSectionName) {
          // Update the member's section name
          const updatedMember: Member = { ...member, section: correctSectionName };
          this.members.set(member.id, updatedMember);
          updatedCount++;
        }
      }
    }
    
    console.log(`Synchronized ${updatedCount} member section names`);
    return { updatedCount };
  }
}

import { db } from "./db";
import { eq, and, sql, desc, asc, like, or, isNotNull, isNull } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // Helper method to ensure member data has proper null handling
  private transformMemberFromDb(member: any): Member {
    return {
      ...member,
      // Handle any undefined values that should be null
      birthDate: member.birthDate || null,
      email: member.email || null,
      address: member.address || null,
      education: member.education || null,
      educationOther: member.educationOther || null,
      voterCardNumber: member.voterCardNumber || null,
      photoId: member.photoId || null,
      registeredById: member.registeredById || null,
      expirationDate: member.expirationDate || null,
      deletedAt: member.deletedAt || null,
      // Preserve the country, federationId, and sectionId fields
      country: member.country || null,
      federationId: member.federationId || null,
      sectionId: member.sectionId || null,
    } as Member;
  }

  // Section methods
  async getSection(id: number): Promise<Section | undefined> {
    const [section] = await db.select().from(sections).where(eq(sections.id, id));
    return section;
  }
  
  async getSectionsByFederation(federationId: number): Promise<Section[]> {
    return db.select().from(sections).where(eq(sections.federationId, federationId));
  }
  
  async getAllSections(): Promise<Section[]> {
    return db.select().from(sections);
  }
  
  async createSection(sectionData: InsertSection): Promise<Section> {
    // Vérifier si la fédération existe
    const federation = await this.getFederation(sectionData.federationId);
    if (!federation) {
      throw new Error(`Federation with ID ${sectionData.federationId} does not exist`);
    }
    
    const [section] = await db
      .insert(sections)
      .values(sectionData)
      .returning();
      
    return section;
  }
  
  async updateSection(id: number, sectionData: Partial<InsertSection>): Promise<Section | undefined> {
    // Si federationId est modifié, vérifier que la nouvelle fédération existe
    if (sectionData.federationId) {
      const federation = await this.getFederation(sectionData.federationId);
      if (!federation) {
        throw new Error(`Federation with ID ${sectionData.federationId} does not exist`);
      }
    }
    
    const [updatedSection] = await db
      .update(sections)
      .set(sectionData)
      .where(eq(sections.id, id))
      .returning();
      
    return updatedSection;
  }
  
  async deleteSection(id: number): Promise<boolean> {
    // Vérifier si la section est utilisée par des membres
    const membersWithSection = await db
      .select()
      .from(members)
      .where(eq(members.sectionId as any, id));
    
    if (membersWithSection.length > 0) {
      throw new Error('Cannot delete section: it is used by one or more members');
    }
    
    await db.delete(sections).where(eq(sections.id, id));
    return true;
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    if (!member) return undefined;
    
    return this.transformMemberFromDb(member);
  }

  async getMemberByMembershipId(membershipId: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.membershipId, membershipId));
    return member;
  }

  async getMemberByPhotoId(photoId: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.photoId, photoId));
    return member;
  }

  async getAllMembers(): Promise<Member[]> {
    // Par défaut, on exclut les membres marqués comme supprimés
    return db.select().from(members).where(
      // Si le champ 'deleted' est défini, vérifier qu'il est à false
      // sinon, inclure tous les membres (pour compatibilité avec les données existantes)
      or(
        eq(members.deleted, false),
        isNull(members.deleted)
      )
    );
  }
  
  // Nouvelle fonction pour obtenir tous les membres, y compris ceux qui sont supprimés
  async getAllMembersIncludingDeleted(): Promise<Member[]> {
    return db.select().from(members);
  }

  private generateMembershipId(): string {
    // Generate a random 8-digit number as a string
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  async checkPotentialDuplicate(member: InsertMember): Promise<{ isDuplicate: boolean, matchingFields: number, isDuplicateByDefinition: boolean, similarMember?: Member }> {
    // Query for potential duplicates based on new criteria: Last name, First name, Date of birth, Federation, Section
    const possibleDuplicates = await db
      .select()
      .from(members)
      .where(
        and(
          // Look for members with same first and last name as starting point
          and(
            eq(members.firstName, member.firstName?.trim()),
            eq(members.lastName, member.lastName?.trim())
          ),
          // Exclure les membres supprimés de la vérification
          or(
            eq(members.deleted, false),
            isNull(members.deleted)
          )
        )
      );

    if (possibleDuplicates.length === 0) {
      return { isDuplicate: false, matchingFields: 0, isDuplicateByDefinition: false };
    }

    // For each possible duplicate, count matching fields based on new criteria
    let bestMatch = {
      member: possibleDuplicates[0],
      matchingFields: 0,
      isDuplicateByDefinition: false
    };

    for (const potentialDuplicate of possibleDuplicates) {
      let matches = 0;

      // Compare fields based on new duplicate criteria (with whitespace normalization)
      const firstNameMatch = potentialDuplicate.firstName?.trim() === member.firstName?.trim();
      const lastNameMatch = potentialDuplicate.lastName?.trim() === member.lastName?.trim();
      const birthDateMatch = potentialDuplicate.birthDate === member.birthDate;
      
      // Federation match - check both federation name and federationId
      const federationMatch = (
        (potentialDuplicate.federation && member.federation && 
         potentialDuplicate.federation.toLowerCase() === member.federation.toLowerCase()) ||
        (potentialDuplicate.federationId && member.federationId && 
         potentialDuplicate.federationId === member.federationId)
      );
      
      // Section match - check both section name and sectionId
      const sectionMatch = (
        (potentialDuplicate.section && member.section && 
         potentialDuplicate.section.toLowerCase() === member.section.toLowerCase()) ||
        (potentialDuplicate.sectionId && member.sectionId && 
         potentialDuplicate.sectionId === member.sectionId)
      );

      // Count matches based on new duplicate criteria
      if (firstNameMatch) matches++;
      if (lastNameMatch) matches++;
      if (birthDateMatch) matches++;
      if (federationMatch) matches++;
      if (sectionMatch) matches++;

      // Check strict duplicate definition: first name, last name, and birth date must match
      const isDuplicateByDefinition = firstNameMatch && lastNameMatch && birthDateMatch;
      
      console.log(`Checking duplicate: ${potentialDuplicate.firstName} ${potentialDuplicate.lastName}`);
      console.log(`Matches: ${matches}, isDuplicateByDefinition: ${isDuplicateByDefinition}`);
      
      // Update best match if this one has more matching fields or is a duplicate by definition
      if (matches > bestMatch.matchingFields || isDuplicateByDefinition) {
        bestMatch = {
          member: potentialDuplicate,
          matchingFields: matches,
          isDuplicateByDefinition: Boolean(isDuplicateByDefinition)
        };
        
        // If we found a strict duplicate, no need to continue checking
        if (isDuplicateByDefinition) break;
      }
    }

    return {
      isDuplicate: bestMatch.matchingFields >= 2, // At least 2 criteria (usually first+last name) must match for potential duplicate
      matchingFields: bestMatch.matchingFields,
      isDuplicateByDefinition: bestMatch.isDuplicateByDefinition,
      similarMember: bestMatch.matchingFields >= 2 ? bestMatch.member : undefined
    };
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    let membershipId = (insertMember as any).membershipId || '';
    
    // Si aucun ID n'est fourni ou si l'ID est vide, générer un nouvel ID
    if (!membershipId || membershipId.trim() === '') {
      // Generate a unique membership ID
      membershipId = this.generateMembershipId();
      let isUnique = false;
      
      // Ensure the generated membership ID is unique
      while (!isUnique) {
        const existingMember = await this.getMemberByMembershipId(membershipId);
        if (!existingMember) {
          isUnique = true;
        } else {
          membershipId = this.generateMembershipId();
        }
      }
    } else {
      // Si un ID est fourni, vérifier s'il est déjà utilisé par un membre non supprimé
      const existingMember = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.membershipId, membershipId),
            or(
              eq(members.deleted, false),
              isNull(members.deleted)
            )
          )
        )
        .limit(1);
        
      // Si l'ID existe déjà et est utilisé par un membre actif, générer un nouvel ID
      if (existingMember.length > 0) {
        console.log(`Membership ID ${membershipId} already exists, generating a new one`);
        membershipId = this.generateMembershipId();
        let isUnique = false;
        
        // Ensure the generated membership ID is unique
        while (!isUnique) {
          const existingMemberCheck = await this.getMemberByMembershipId(membershipId);
          if (!existingMemberCheck) {
            isUnique = true;
          } else {
            membershipId = this.generateMembershipId();
          }
        }
      }
    }
    
    // If sectionId is provided but section name is missing, get section name
    let memberData = { ...insertMember, membershipId };
    if (memberData.sectionId && !memberData.section) {
      const [sectionResult] = await db
        .select({ name: sections.name })
        .from(sections)
        .where(eq(sections.id, memberData.sectionId))
        .limit(1);
      
      if (sectionResult) {
        memberData.section = sectionResult.name;
      }
    }

    // Calculate expiration date (5 years from registration)
    const registrationDate = new Date();
    const expirationDate = new Date(registrationDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 5);
    
    // Add expiration date and updatedAt to member data
    const memberDataWithExpiration = { 
      ...memberData, 
      registrationDate,
      expirationDate,
      updatedAt: registrationDate // Set initial updatedAt to registration date
    };

    // Create the member with the original or generated membership ID
    const [member] = await db
      .insert(members)
      .values(memberDataWithExpiration)
      .returning();
    
    // Update statistics
    await this.updateMemberStatistics();
    
    return member;
  }

  async updateMember(id: number, memberData: Partial<InsertMember>): Promise<Member | undefined> {
    // Get the existing member first to preserve photo if not provided
    const existingMember = await this.getMember(id);
    if (!existingMember) return undefined;

    // If photoId is empty or undefined but member had a photo, preserve it
    if ((!memberData.photoId || memberData.photoId === '') && existingMember.photoId) {
      memberData.photoId = existingMember.photoId;
    }

    // Set updatedAt to current timestamp
    const updateData = {
      ...memberData,
      updatedAt: new Date()
    };

    const [updatedMember] = await db
      .update(members)
      .set(updateData)
      .where(eq(members.id, id))
      .returning();

    // Update statistics
    await this.updateMemberStatistics();
    
    return updatedMember;
  }

  async deleteMember(id: number): Promise<boolean> {
    // Au lieu de supprimer le membre, nous le marquons comme supprimé
    await db.update(members)
      .set({
        deleted: true,
        deletedAt: new Date()
      })
      .where(eq(members.id, id));
    
    // Récupérer et supprimer les cartes du membre
    const memberCards = await this.getMemberCardsByMemberId(id);
    for (const card of memberCards) {
      await this.deleteMemberCard(card.id);
    }
    
    // Update statistics - exclure les membres supprimés
    await this.updateMemberStatistics();
    
    return true;
  }

  async getFilteredMembers(filter: any): Promise<Member[]> {
    // Build query conditions
    let conditions = [];
    
    // Par défaut, exclure les membres supprimés
    // Si le champ 'deleted' est défini, vérifier qu'il est à false
    // sinon, inclure tous les membres (pour compatibilité avec les données existantes)
    if (!filter?.includeDeleted) {
      conditions.push(
        or(
          eq(members.deleted, false),
          isNull(members.deleted)
        )
      );
    }
    
    if (filter) {
      if (filter.name) {
        conditions.push(
          or(
            like(members.firstName, `%${filter.name}%`),
            like(members.lastName, `%${filter.name}%`)
          )
        );
      }
      
      if (filter.gender) {
        conditions.push(eq(members.gender, filter.gender));
      }
      
      if (filter.federation) {
        conditions.push(eq(members.federation, filter.federation));
      }
      
      if (filter.hasVoterCard) {
        conditions.push(eq(members.hasVoterCard, filter.hasVoterCard));
      }
      
      if (filter.pendingApproval) {
        const pendingValue = filter.pendingApproval === 'true';
        conditions.push(eq(members.pendingApproval, pendingValue));
      }
      
      // Si on veut spécifiquement les membres supprimés
      if (filter.deletedOnly) {
        conditions.push(eq(members.deleted, true));
      }
    }
    
    // Execute query
    let result: Member[];
    
    if (conditions.length === 0) {
      // No filters, get all members
      result = await db
        .select()
        .from(members)
        .orderBy(desc(members.registrationDate));
    } else if (conditions.length === 1) {
      // Single condition
      result = await db
        .select()
        .from(members)
        .where(conditions[0])
        .orderBy(desc(members.registrationDate));
    } else {
      // Multiple conditions combined with AND
      result = await db
        .select()
        .from(members)
        .where(and(...conditions))
        .orderBy(desc(members.registrationDate));
    }
    
    return result;
  }

  async getFederation(id: number): Promise<Federation | undefined> {
    const [federation] = await db.select().from(federations).where(eq(federations.id, id));
    return federation;
  }

  async getAllFederations(): Promise<Federation[]> {
    const result = await db.select().from(federations).orderBy(asc(federations.name));
    return result;
  }

  async createFederation(federationData: InsertFederation): Promise<Federation> {
    const [federation] = await db
      .insert(federations)
      .values(federationData)
      .returning();
    return federation;
  }

  async updateFederation(id: number, federationData: Partial<InsertFederation>): Promise<Federation | undefined> {
    const [updatedFederation] = await db
      .update(federations)
      .set(federationData)
      .where(eq(federations.id, id))
      .returning();
    return updatedFederation;
  }

  async deleteFederation(id: number): Promise<boolean> {
    await db.delete(federations).where(eq(federations.id, id));
    return true;
  }

  async getStatistics(): Promise<Statistics | undefined> {
    const [stats] = await db.select().from(statistics);
    return stats;
  }

  async updateStatistics(statsData: InsertStatistics): Promise<Statistics | undefined> {
    // Check if statistics exist
    const existingStats = await this.getStatistics();
    
    if (existingStats) {
      // Update existing statistics
      const [updatedStats] = await db
        .update(statistics)
        .set({ ...statsData, lastUpdated: new Date() })
        .where(eq(statistics.id, existingStats.id))
        .returning();
      return updatedStats;
    } else {
      // Create new statistics
      const [newStats] = await db
        .insert(statistics)
        .values(statsData)
        .returning();
      return newStats;
    }
  }

  private async updateMemberStatistics(): Promise<void> {
    // Get all members for statistics calculation
    const allMembers = await this.getAllMembers();
    
    // Calculate statistics
    const totalMembers = allMembers.length;
    
    // Gender distribution
    const membersByGender: Record<string, number> = {
      male: 0,
      female: 0,
    };
    
    // Age distribution
    const membersByAge: Record<string, number> = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '65+': 0,
    };
    
    // Region/Federation distribution
    const membersByRegion: Record<string, number> = {};
    
    // Voter card status distribution
    const membersByVoterCard: Record<string, number> = {
      yes: 0,
      no: 0,
      processing: 0,
    };
    
    // Calculate statistics from members
    allMembers.forEach(member => {
      // Gender stats
      if (member.gender in membersByGender) {
        membersByGender[member.gender]++;
      }
      
      // Age stats
      if (member.birthDate) {
        const birthYear = parseInt(member.birthDate.split('-')[0]);
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
      
        if (age <= 25) membersByAge['18-25']++;
        else if (age <= 35) membersByAge['26-35']++;
        else if (age <= 45) membersByAge['36-45']++;
        else if (age <= 55) membersByAge['46-55']++;
        else if (age <= 65) membersByAge['56-65']++;
        else membersByAge['65+']++;
      }
      
      // Federation stats
      if (member.federation) {
        if (membersByRegion[member.federation]) {
          membersByRegion[member.federation]++;
        } else {
          membersByRegion[member.federation] = 1;
        }
      }
      
      // Voter card stats
      if (member.hasVoterCard && member.hasVoterCard in membersByVoterCard) {
        membersByVoterCard[member.hasVoterCard]++;
      }
    });
    
    // Update statistics in database
    await this.updateStatistics({
      totalMembers,
      membersByGender,
      membersByRegion,
      membersByAge,
      membersByVoterCard,
    });
  }

  private async getFederationByName(name: string): Promise<Federation | undefined> {
    const [federation] = await db
      .select()
      .from(federations)
      .where(eq(federations.name, name));
    return federation;
  }

  async getRegion(id: number): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    return region;
  }

  async getRegionByName(name: string): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.name, name));
    return region;
  }

  async getAllRegions(): Promise<Region[]> {
    const result = await db.select().from(regions);
    return result;
  }

  async createRegion(regionData: InsertRegion): Promise<Region> {
    // Assurer la compatibilité avec l'ancien schéma en définissant des valeurs par défaut
    // pour les champs country et country_en s'ils ne sont pas fournis
    const enhancedData = {
      ...regionData,
      // Utiliser le code comme country s'il est fourni, sinon utiliser un placeholder
      country: regionData.country || regionData.code || "Unknown",
      // Utiliser name_en comme country_en s'il est fourni, sinon utiliser country
      country_en: regionData.country_en || regionData.name_en || regionData.country || regionData.code || "Unknown"
    };
    
    const [region] = await db
      .insert(regions)
      .values(enhancedData)
      .returning();
    return region;
  }

  async updateRegion(id: number, regionData: Partial<InsertRegion>): Promise<Region | undefined> {
    const [updatedRegion] = await db
      .update(regions)
      .set(regionData)
      .where(eq(regions.id, id))
      .returning();
    return updatedRegion;
  }

  async deleteRegion(id: number): Promise<boolean> {
    await db.delete(regions).where(eq(regions.id, id));
    return true;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }
  
  async getAllMessages(): Promise<Message[]> {
    return db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getMessagesBySender(senderId: number): Promise<Message[]> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.senderId, senderId))
      .orderBy(desc(messages.createdAt));
    return result;
  }

  async getMessagesByReceiver(receiverId: number): Promise<Message[]> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.receiverId, receiverId))
      .orderBy(desc(messages.createdAt));
    return result;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async deleteMessage(id: number): Promise<boolean> {
    await db.delete(messages).where(eq(messages.id, id));
    return true;
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));
    
    return result[0]?.count || 0;
  }

  async getGroupMessage(id: number): Promise<GroupMessage | undefined> {
    const [message] = await db.select().from(groupMessages).where(eq(groupMessages.id, id));
    return message;
  }

  async getGroupMessagesBySender(senderId: number): Promise<GroupMessage[]> {
    const result = await db
      .select()
      .from(groupMessages)
      .where(eq(groupMessages.senderId, senderId))
      .orderBy(desc(groupMessages.createdAt));
    return result;
  }

  async createGroupMessage(messageData: InsertGroupMessage, recipientCount: number): Promise<GroupMessage> {
    const [message] = await db
      .insert(groupMessages)
      .values({ ...messageData, recipientCount })
      .returning();
    return message;
  }

  async deleteGroupMessage(id: number): Promise<boolean> {
    await db.delete(groupMessages).where(eq(groupMessages.id, id));
    return true;
  }

  // Member Cards methods
  async getMemberCard(id: number): Promise<MemberCard | undefined> {
    const [card] = await db.select().from(memberCards).where(eq(memberCards.id, id));
    return card;
  }

  async getMemberCardByCardNumber(cardNumber: string): Promise<MemberCard | undefined> {
    const [card] = await db.select().from(memberCards).where(eq(memberCards.cardNumber, cardNumber));
    return card;
  }

  async getMemberCardsByMemberId(memberId: number): Promise<MemberCard[]> {
    return db.select().from(memberCards).where(eq(memberCards.memberId, memberId));
  }

  async getAllMemberCards(): Promise<MemberCard[]> {
    return db.select().from(memberCards);
  }

  private generateCardNumber(): string {
    // Format: UDRG-YYYY-XXXXX where YYYY is year and XXXXX is random
    const year = new Date().getFullYear().toString();
    const random = Math.floor(10000 + Math.random() * 90000).toString();
    return `UDRG-${year}-${random}`;
  }

  private async getCardNumberFromMemberId(memberId: number): Promise<string> {
    // Use the membershipId of the member as the card number
    const member = await this.getMember(memberId);
    if (member) {
      return member.membershipId;
    }
    // Fallback to auto-generated number if member not found
    return this.generateCardNumber();
  }

  async createMemberCard(cardData: InsertMemberCard): Promise<MemberCard> {
    // Generate card number if not provided
    let finalCardNumber: string;
    
    if (!cardData.cardNumber) {
      // Use the member's existing membership ID as the card number
      finalCardNumber = await this.getCardNumberFromMemberId(cardData.memberId);
      
      // Check if this card number is already used
      const existingCard = await this.getMemberCardByCardNumber(finalCardNumber);
      if (existingCard) {
        // If already used, append a suffix to make it unique
        const suffix = '-' + new Date().getTime().toString().slice(-4);
        finalCardNumber += suffix;
      }
    } else {
      finalCardNumber = cardData.cardNumber;
    }
    
    // Use the array notation for values to avoid TypeScript errors
    const [card] = await db
      .insert(memberCards)
      .values([{
        memberId: cardData.memberId,
        cardNumber: finalCardNumber,
        expiryDate: cardData.expiryDate,
        status: cardData.status,
        qrCodeData: cardData.qrCodeData,
        cardTemplate: cardData.cardTemplate || "standard",
        metadata: cardData.metadata
      }])
      .returning();
      
    return card;
  }

  async updateMemberCard(id: number, cardData: Partial<InsertMemberCard>): Promise<MemberCard | undefined> {
    const [updatedCard] = await db
      .update(memberCards)
      .set(cardData)
      .where(eq(memberCards.id, id))
      .returning();
    return updatedCard;
  }

  async incrementPrintCount(id: number): Promise<MemberCard | undefined> {
    const card = await this.getMemberCard(id);
    if (!card) return undefined;
    
    const [updatedCard] = await db
      .update(memberCards)
      .set({
        printedCount: card.printedCount + 1,
        lastPrintedAt: new Date()
      })
      .where(eq(memberCards.id, id))
      .returning();
      
    return updatedCard;
  }

  async deleteMemberCard(id: number): Promise<boolean> {
    await db.delete(memberCards).where(eq(memberCards.id, id));
    return true;
  }

  async synchronizeMemberSectionNames(): Promise<{ updatedCount: number }> {
    try {
      // Get all members with section IDs
      const membersWithSections = await db
        .select({
          id: members.id,
          sectionId: members.sectionId,
          currentSection: members.section
        })
        .from(members)
        .where(and(
          isNotNull(members.sectionId),
          isNotNull(members.section)
        ));

      // Get all sections
      const allSections = await db.select().from(sections);
      const sectionMap = new Map(allSections.map(s => [s.id, s.name]));

      let updatedCount = 0;

      // Update each member whose section name doesn't match
      for (const member of membersWithSections) {
        const correctSectionName = member.sectionId ? sectionMap.get(member.sectionId) : undefined;
        if (correctSectionName && member.currentSection !== correctSectionName) {
          await db
            .update(members)
            .set({ section: correctSectionName })
            .where(eq(members.id, member.id));
          updatedCount++;
        }
      }

      console.log(`Synchronized ${updatedCount} member section names`);
      return { updatedCount };
    } catch (error) {
      console.error('Error synchronizing member section names:', error);
      throw error;
    }
  }
}

// Use database storage instead of memory storage for persistence
export const storage = new DatabaseStorage();
