import { db } from "../server/db";
import { users } from "../shared/schema";

async function initializeDatabase() {
  console.log("Initializing database with default admin user...");

  // Check if an admin user already exists
  const existingUsers = await db.select().from(users);
  
  if (existingUsers.length > 0) {
    console.log("Database already has users. Skipping initialization.");
    process.exit(0);
  }

  // Create default system admin user
  const admin = await db.insert(users).values({
    username: "admin",
    password: "admin123", // This should be hashed in a real application
    name: "System Administrator",
    email: "admin@udrg.org",
    role: "sysadmin",
  }).returning();

  console.log("Created default admin user:", admin[0].username);
  console.log("Default password is 'admin123'. Please change it immediately after login.");
  
  process.exit(0);
}

initializeDatabase().catch(error => {
  console.error("Error initializing database:", error);
  process.exit(1);
});