import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";
import { initialPhotos } from "./src/data/initialPhotos.js"; // Esbuild will resolve or compile appropriately
import { Photo, UserAccount, UserRole, UserStatus, FullResRequest } from "./src/types.ts";

import {
  getPhotosFromDb,
  savePhotoToDb,
  deletePhotoFromDb,
  getUsersFromDb,
  saveUserToDb,
  deleteUserFromDb,
  getFullResRequestsFromDb,
  saveFullResRequestToDb,
  getActionLogsFromDb,
  saveActionLogToDb,
  getCollectionsFromDb,
  saveCollectionToDb,
  getPhotographersFromDb,
  savePhotographerToDb,
  deletePhotographerFromDb,
  getAppSettingsFromDb,
  saveAppSettingsToDb
} from "./src/db/queries.ts";
import { seedDatabase } from "./src/db/seed.ts";
import { requireAuth, AuthRequest, generateLocalToken } from "./src/middleware/auth.ts";


// In-memory collections
let appSettings = {
  linkedInUrl: "https://sy.linkedin.com/company/hcsyria",
  embedCode: ""
};

let photosCollection: Photo[] = initialPhotos.map((p, i) => ({
  ...p,
  status: p.status || "Approved",
  views: p.views || (24 + Math.floor(Math.random() * 180)),
  downloads: p.downloads || (12 + Math.floor(Math.random() * 60)),
  city: p.city || p.location.split(",")[0].trim(),
  timeCreated: p.timeCreated || `${String(9 + (i % 6)).padStart(2, '0')}:${String((i * 12) % 60).padStart(2, '0')}`,
  dateUploaded: p.dateUploaded || p.dateCreated,
  isFeatured: p.id === "photo_2", // Explicitly feature our Syrian grandfather and grandson cover photo on start
  reactions: p.reactions || {
    like: 8 + (i * 3) % 20,
    love: 12 + (i * 4) % 25,
    inspiring: 5 + (i * 2) % 12,
  },
  userReactions: {
    like: [],
    love: [],
    inspiring: [],
  },
  cameraSettings: {
    ...p.cameraSettings,
    focalLength: p.cameraSettings?.focalLength || (p.cameraSettings?.lens?.match(/\d+mm/)?.[0] || "50mm")
  }
}));

// Function to format username to name.surname format
function formatUsername(name: string): string {
  let formatted = name.trim().toLowerCase()
    .replace(/[\s\-_]+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.+/g, ".");
  if (!formatted.includes(".")) {
    formatted = formatted + ".user";
  }
  return formatted;
}

// Case, space, underscore, period-insensitive name normalization for deduplication
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s\-_.]+/g, " ");
}

async function sendRealEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT || "465";
  const port = parseInt(portStr, 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || "Christian Hope Center Aleppo";
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  if (!host || !user || !pass) {
    console.warn(`[EMAIL SENDER] SMTP credentials not fully configured (SMTP_HOST, SMTP_USER, or SMTP_PASS is missing). Email to ${to} was not sent via real SMTP.`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`[EMAIL SENDER] Successfully sent real email to ${to} regarding "${subject}"`);
    return true;
  } catch (error) {
    console.error(`[EMAIL SENDER] Failed to send real email to ${to}:`, error);
    return false;
  }
}

let deletedUsersLog: UserAccount[] = [];
let fullResRequests: FullResRequest[] = [];

// Action Logs type and collection
export interface ActionLog {
  id: string;
  userId: string;
  userEmail: string;
  action: "upload" | "delete" | "approve" | "new_cover" | string;
  details: string;
  timestamp: string;
}

let actionLogs: ActionLog[] = [
  {
    id: "log_1",
    userId: "user_owner1",
    userEmail: "ct.aleppo2@gmail.com",
    action: "approve",
    details: "Approved photo 'Hope in Aleppo Alleyway' (ID: photo_2)",
    timestamp: "2026-07-05T10:00:00.000Z"
  },
  {
    id: "log_2",
    userId: "user_owner1",
    userEmail: "ct.aleppo2@gmail.com",
    action: "new_cover",
    details: "Set photo 'Hope in Aleppo Alleyway' (ID: photo_2) as featured cover image",
    timestamp: "2026-07-06T14:30:00.000Z"
  }
];

function logAction(userEmail: string, action: "upload" | "delete" | "approve" | "new_cover", details: string) {
  const user = usersCollection.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
  const logEntry: ActionLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: user ? user.id : "unknown",
    userEmail: userEmail || "anonymous@chcsyria.org",
    action,
    details,
    timestamp: new Date().toISOString()
  };
  actionLogs.unshift(logEntry);
  saveDb();
}

let usersCollection: UserAccount[] = [
  {
    id: "user_owner1",
    email: "ct.aleppo2@gmail.com",
    password: "hccthcct",
    emailVerified: true,
    name: "ct.aleppo2",
    role: "super_admin",
    status: "Approved",
    createdAt: "2026-07-02",
    provider: "email",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    bio: "Main System Owner & Administrator.",
    organization: "Christian Hope Center Aleppo",
    notifications: []
  }
];

let photographersCollection: any[] = [];

// Collections database
let collectionsCollection = [
  { name: "Emergency Relief 2026", description: "Direct response and humanitarian aid actions in early 2026." },
  { name: "Children and Education", description: "Fostering hope through schooling, literacy, and child-safe spaces." },
  { name: "Healthcare Outreach", description: "Mobile clinics, dental checkups, and regional hospital support missions." }
];

const DB_FILE = path.join(process.cwd(), "data_store.json");

async function saveDb() {
  try {
    // 1. Save main config settings
    await saveAppSettingsToDb(appSettings);

    // 2. Save collections
    for (const col of collectionsCollection) {
      await saveCollectionToDb(col);
    }

    // 3. Save users
    for (const user of usersCollection) {
      await saveUserToDb(user);
    }

    // 4. Save photos
    for (const photo of photosCollection) {
      await savePhotoToDb(photo);
    }

    // 5. Save photographers
    for (const ph of photographersCollection) {
      await savePhotographerToDb(ph);
    }

    // 6. Save full-res requests
    for (const req of fullResRequests) {
      await saveFullResRequestToDb(req);
    }

    // Write a backup JSON payload locally
    const data = {
      appSettings,
      photosCollection,
      usersCollection,
      photographersCollection,
      deletedUsersLog,
      fullResRequests,
      actionLogs,
      collectionsCollection
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    console.log("[DB] Synchronized memory collections to Cloud SQL database successfully.");
  } catch (err) {
    console.error("[DB ERROR] Failed to sync data to Cloud SQL database:", err);
  }
}

async function loadDb() {
  try {
    // 1. Run database seeding
    await seedDatabase();

    // 2. Fetch latest data from database
    const dbPhotos = await getPhotosFromDb();
    if (dbPhotos.length > 0) {
      photosCollection = dbPhotos;
    }

    const dbUsers = await getUsersFromDb();
    if (dbUsers.length > 0) {
      usersCollection = dbUsers;
    }

    const dbPhotographers = await getPhotographersFromDb();
    if (dbPhotographers.length > 0) {
      photographersCollection = dbPhotographers;
    }

    const dbRequests = await getFullResRequestsFromDb();
    if (dbRequests.length > 0) {
      fullResRequests = dbRequests;
    }

    const dbLogs = await getActionLogsFromDb();
    if (dbLogs.length > 0) {
      actionLogs = dbLogs;
    }

    const dbCollections = await getCollectionsFromDb();
    if (dbCollections.length > 0) {
      collectionsCollection = dbCollections;
    }

    const dbSettings = await getAppSettingsFromDb();
    appSettings = dbSettings;

    console.log("[DB] Successfully pulled all synchronized collections from Cloud SQL PostgreSQL.");
  } catch (err) {
    console.warn("[DB WARNING] Cloud SQL was unreachable or errored, defaulting to in-memory datasets:", err);
  }
}


const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.url} - Status: ${res.statusCode} - Duration: ${Date.now() - start}ms\n`;
    try {
      fs.appendFileSync(path.join(process.cwd(), "server_requests.log"), logLine, "utf-8");
    } catch (e) {}
  });
  next();
});

// Setup local uploads folder for static storage of user-uploaded images
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const PHOTOS_SUBDIR = path.join(UPLOADS_DIR, "photos");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PHOTOS_SUBDIR)) {
  fs.mkdirSync(PHOTOS_SUBDIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));

// Helper to extract base64 images, save to disk, and return local static asset URLs
function saveBase64Image(url: string, id: string): string {
  if (!url || !url.startsWith("data:")) {
    return url; // Return as-is if it's already a URL or empty
  }

  try {
    const commaIndex = url.indexOf(",");
    if (commaIndex === -1) {
      return url;
    }

    const prefix = url.substring(0, commaIndex);
    const base64Data = url.substring(commaIndex + 1);

    if (!prefix.includes(";base64")) {
      return url;
    }

    // Safely extract MIME type from the short prefix
    const mimeMatch = prefix.match(/^data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    
    // Detect file extension
    let ext = "jpg";
    if (mimeType.includes("png")) ext = "png";
    else if (mimeType.includes("webp")) ext = "webp";
    else if (mimeType.includes("gif")) ext = "gif";

    const filename = `${id}.${ext}`;
    const filepath = path.join(PHOTOS_SUBDIR, filename);
    
    fs.writeFileSync(filepath, Buffer.from(base64Data, "base64"));
    console.log(`[UPLOADS] Successfully saved base64 image asset to disk: ${filepath}`);
    
    return `/uploads/photos/${filename}`;
  } catch (err) {
    console.error("[UPLOADS] Critical failure saving base64 image to disk:", err);
    return url; // fallback to base64 string if file-write fails
  }
}

// Lazy initializer for GoogleGenAI
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets. Please configure it in Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

// REST API Endpoints

// Authentication & Account Management Endpoints

// 1. User Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    let user = usersCollection.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      res.status(401).json({ error: "No account found with this email. Please sign up." });
      return;
    }

    if (user.password !== password) {
      res.status(401).json({ error: "Incorrect password." });
      return;
    }

    if (user.status === "Pending") {
      res.status(403).json({
        error: "Your account is registered but pending approval by the owner (ct.aleppo2@gmail.com).",
        code: "PENDING_APPROVAL"
      });
      return;
    }

    if (user.status === "Rejected") {
      res.status(403).json({
        error: "Your account registration has been declined by the administrator.",
        code: "REJECTED"
      });
      return;
    }

    const token = generateLocalToken(user.uid || user.id);
    res.json({ user, token, message: "Logged in successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 1b. Simulated Sandbox Google Login (Fallback for unauthorized-domain issues in Cloud Run)
app.post("/api/auth/google-sandbox", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required for sandbox Google Sign-In." });
      return;
    }

    let user = usersCollection.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      const isOwner = email.toLowerCase() === "ct.aleppo2@gmail.com";
      const defaultRole = isOwner ? "super_admin" : "external_user";
      const defaultStatus = isOwner ? "Approved" : "Pending";
      const name = email.split("@")[0];

      user = {
        id: isOwner ? "user_owner1" : `user_${Date.now()}`,
        uid: isOwner ? "user_owner1" : `user_${Date.now()}`,
        email: email.toLowerCase(),
        name: name,
        role: defaultRole,
        status: defaultStatus,
        createdAt: new Date().toISOString().split("T")[0],
        provider: "google",
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`,
        bio: isOwner ? "Main System Owner & Administrator." : "External Collaborator",
        organization: isOwner ? "Christian Hope Center Aleppo" : ""
      };

      usersCollection.push(user);
      await saveUserToDb(user);
      saveDb();
    }

    const token = generateLocalToken(user.uid || user.id);
    res.json({ user, token, message: "Sandbox Google login simulated successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. User Registration (Email-based)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name, role, organization } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, name, and password are required." });
      return;
    }

    const exists = usersCollection.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "This email address is already registered." });
      return;
    }

    const formattedName = formatUsername(name);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser: UserAccount = {
      id: `user_${Date.now()}`,
      email: email.toLowerCase(),
      password,
      emailVerified: true,
      name: formattedName,
      role: (role as UserRole) || "external_user",
      status: "Pending", // Needs admin or archive manager approval
      createdAt: new Date().toISOString().split("T")[0],
      provider: "email",
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`,
      organization: organization || ""
    };

    usersCollection.push(newUser);

    // Notify Admins & Archive Managers of pending registration immediately
    usersCollection.forEach((u) => {
      if (["super_admin", "archive_manager"].includes(u.role)) {
        if (!u.notifications) u.notifications = [];
        u.notifications.unshift({
          id: `notif_reg_${newUser.id}_${Date.now()}`,
          message: `Action Needed: New pending account registration from "${newUser.name}" (${newUser.email}).`,
          read: false,
          timestamp: new Date().toISOString()
        });
      }
    });

    saveDb();

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status,
        provider: newUser.provider,
        emailVerified: newUser.emailVerified
      },
      message: "Registration successful! Your account is now pending approval by the administrator."
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. Email Verification
app.post("/api/auth/verify-email", (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: "Email and verification code are required." });
      return;
    }

    const user = usersCollection.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (user.verificationCode !== code) {
      res.status(400).json({ error: "Incorrect verification code." });
      return;
    }

    user.emailVerified = true;
    user.verificationCode = undefined;

    // Notify Admins & Archive Managers of pending registration AFTER email is verified
    usersCollection.forEach((u) => {
      if (["super_admin", "archive_manager"].includes(u.role)) {
        if (!u.notifications) u.notifications = [];
        u.notifications.unshift({
          id: `notif_reg_${user.id}_${Date.now()}`,
          message: `Action Needed: New pending account registration from "${user.name}" (${user.email}).`,
          read: false,
          timestamp: new Date().toISOString()
        });
      }
    });

    saveDb();

    res.json({
      success: true,
      message: "Email verified successfully! Your account is now pending approval by the owner."
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password - requests a 6-digit verification reset code
app.post("/api/auth/forgot-password", (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email address is required." });
      return;
    }

    const user = usersCollection.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.status(404).json({ error: "No account found with this email address. Please sign up." });
      return;
    }

    // Generate a 6-digit random code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    saveDb();

    // We return the resetCode so the frontend can intercept and simulate the email in Sandbox Mailbox
    res.json({
      success: true,
      message: "A password reset code has been generated. Since real SMTP email delivery is not configured, we have routed the code to the Sandbox Mailbox widget.",
      resetCode,
      email: user.email
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Password - validates code and updates password
app.post("/api/auth/reset-password", (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      res.status(400).json({ error: "Email, reset code, and new password are required." });
      return;
    }

    const user = usersCollection.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.status(404).json({ error: "No account found with this email address." });
      return;
    }

    if (!user.resetCode || user.resetCode !== code) {
      res.status(400).json({ error: "Incorrect or invalid password reset code." });
      return;
    }

    if (user.resetCodeExpires && Date.now() > user.resetCodeExpires) {
      res.status(400).json({ error: "The password reset code has expired. Please request a new one." });
      return;
    }

    // Update password
    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;

    saveDb();

    res.json({
      success: true,
      message: "Password updated successfully! You can now log in with your new password."
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync endpoint to merge client-side localStorage state with server-side database
app.post("/api/sync", (req, res) => {
  try {
    const { users: localUsers, photos: localPhotos, photographers: localPhotographers, requests: localRequests, logs: localLogs } = req.body;
    let modified = false;

    // 1. Sync users
    if (Array.isArray(localUsers)) {
      localUsers.forEach((u: any) => {
        if (!u || !u.email) return;
        const existing = usersCollection.find(x => x.email.toLowerCase() === u.email.toLowerCase());
        if (!existing) {
          usersCollection.push(u);
          modified = true;
        } else {
          // If the local user is verified but server is not, or status is different, merge
          if (u.emailVerified && !existing.emailVerified) {
            existing.emailVerified = true;
            existing.verificationCode = undefined;
            modified = true;
          }
          if (u.status !== existing.status && u.status !== "Pending") {
            // Give preference to approved status
            existing.status = u.status;
            modified = true;
          }
        }
      });
    }

    // 2. Sync photographers
    if (Array.isArray(localPhotographers)) {
      localPhotographers.forEach((p: any) => {
        if (!p || !p.id) return;
        const exists = photographersCollection.some(x => x.id === p.id) || usersCollection.some(u => u.isPhotographer && `usr_${u.id}` === p.id);
        if (!exists && !p.id.startsWith("usr_")) {
          photographersCollection.push(p);
          modified = true;
        }
      });
    }

    // 3. Sync photos
    if (Array.isArray(localPhotos)) {
      localPhotos.forEach((p: any) => {
        if (!p || !p.id) return;
        const exists = photosCollection.some(x => x.id === p.id);
        if (!exists) {
          photosCollection.push(p);
          modified = true;
        }
      });
    }

    // 4. Sync fullres requests
    if (Array.isArray(localRequests)) {
      localRequests.forEach((r: any) => {
        if (!r || !r.id) return;
        const exists = fullResRequests.some(x => x.id === r.id);
        if (!exists) {
          fullResRequests.push(r);
          modified = true;
        }
      });
    }

    // 5. Sync action logs
    if (Array.isArray(localLogs)) {
      localLogs.forEach((l: any) => {
        if (!l || !l.id) return;
        const exists = actionLogs.some(x => x.id === l.id);
        if (!exists) {
          actionLogs.push(l);
          modified = true;
        }
      });
    }

    if (modified) {
      saveDb();
    }

    res.json({
      success: true,
      users: usersCollection,
      photos: photosCollection,
      photographers: photographersCollection,
      fullResRequests,
      actionLogs
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. Get current user profile (using Firebase auth)
app.get("/api/users/me", requireAuth, (req: AuthRequest, res) => {
  res.json(req.user);
});

// 3. Get all users (Admin only)
app.get("/api/users", (req, res) => {
  try {
    res.json(usersCollection);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3b. Get single user details (including live notifications)
app.get("/api/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const user = usersCollection.find(u => u.id === id);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Update user role, status, or photographer badge (Admin/Host/Owner)
app.put("/api/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { role, status, isPhotographer } = req.body;
    const index = usersCollection.findIndex(u => u.id === id);
    if (index === -1) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (role) usersCollection[index].role = role;
    if (isPhotographer !== undefined) {
      usersCollection[index].isPhotographer = !!isPhotographer;
    }
    if (status) {
      usersCollection[index].status = status;
      if (status === "Approved") {
        if (!usersCollection[index].notifications) usersCollection[index].notifications = [];
        usersCollection[index].notifications.unshift({
          id: `notif_user_approved_${Date.now()}`,
          message: `Your account registration has been approved! Welcome to HCSyria Media Space as a ${usersCollection[index].role}.`,
          read: false,
          timestamp: new Date().toISOString()
        });
      } else if (status === "Rejected") {
        if (!usersCollection[index].notifications) usersCollection[index].notifications = [];
        usersCollection[index].notifications.unshift({
          id: `notif_user_rejected_${Date.now()}`,
          message: `Your account registration was rejected. Please contact an administrator if you believe this is an error.`,
          read: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    saveDb();
    res.json({ success: true, user: usersCollection[index] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Delete a user (Admin/Owner only - soft delete with logs)
app.delete("/api/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const index = usersCollection.findIndex(u => u.id === id);
    if (index === -1) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    
    // Log the deletion and keep all user data
    const removedUser = { ...usersCollection[index], isDeleted: true };
    deletedUsersLog.push(removedUser);
    
    usersCollection.splice(index, 1);
    saveDb();
    res.json({ success: true, removed: removedUser, logSize: deletedUsersLog.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5b. Get deleted users log (Owner only)
app.get("/api/users/deleted-logs", (req, res) => {
  try {
    res.json(deletedUsersLog);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get system action logs (Owner and Admins)
app.get("/api/action-logs", (req, res) => {
  try {
    res.json(actionLogs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Collections routes

app.get("/api/collections", (req, res) => {
  try {
    const dynamicNames = new Set(photosCollection.map(p => p.collection).filter(Boolean) as string[]);
    collectionsCollection.forEach(c => dynamicNames.add(c.name));
    const list = Array.from(dynamicNames).map(name => {
      const existing = collectionsCollection.find(c => c.name === name);
      return {
        name,
        description: existing ? existing.description : "Humanitarian photo collection."
      };
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/collections", (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: "Collection name is required" });
      return;
    }
    const trimmedName = name.trim();
    const exists = collectionsCollection.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "Collection already exists" });
      return;
    }
    const newCol = { name: trimmedName, description: description || "Custom user collection." };
    collectionsCollection.push(newCol);
    saveDb();
    res.json({ success: true, collection: newCol });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Photographers database CRUD routes
app.get("/api/photographers", (req, res) => {
  try {
    const list: any[] = [...photographersCollection];
    
    // Add users marked as photographers
    const promotedUsers = usersCollection.filter(u => u.isPhotographer);
    const seenNormalized = new Set<string>();

    list.forEach(p => {
      seenNormalized.add(normalizeName(p.name));
    });

    promotedUsers.forEach(u => {
      const norm = normalizeName(u.name);
      if (!seenNormalized.has(norm)) {
        seenNormalized.add(norm);
        list.push({
          id: `usr_${u.id}`,
          name: u.name,
          avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`,
          coverUrl: u.coverUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
          bio: u.bio || "Registered workspace user.",
          joinedDate: u.createdAt,
          status: "Approved",
          isUserAccount: true,
          userId: u.id
        });
      }
    });

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/photographers", (req, res) => {
  try {
    const { name, avatarUrl, coverUrl, bio, status } = req.body;
    if (!name) {
      res.status(400).json({ error: "Photographer name is required" });
      return;
    }

    const nameTrimmed = name.trim();
    const normNew = normalizeName(nameTrimmed);

    const existsInExplicit = photographersCollection.some(p => normalizeName(p.name) === normNew);
    const existsInUsers = usersCollection.some(u => u.isPhotographer && normalizeName(u.name) === normNew);

    if (existsInExplicit || existsInUsers) {
      res.status(400).json({ error: "A photographer or user with this name already exists." });
      return;
    }

    const finalAvatarUrl = (avatarUrl && avatarUrl.trim()) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameTrimmed)}`;
    const finalCoverUrl = (coverUrl && coverUrl.trim()) || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80";

    const newPh = {
      id: `ph_${Date.now()}`,
      name: nameTrimmed,
      avatarUrl: finalAvatarUrl,
      coverUrl: finalCoverUrl,
      bio: (bio && bio.trim()) || "Verified photographer identity.",
      joinedDate: new Date().toISOString().split("T")[0],
      status: status || "Approved"
    };

    photographersCollection.push(newPh);
    saveDb();
    res.status(201).json({ success: true, photographer: newPh });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/photographers/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatarUrl, coverUrl, bio, status } = req.body;

    if (id.startsWith("usr_")) {
      const realUserId = id.replace("usr_", "");
      const uIndex = usersCollection.findIndex(u => u.id === realUserId);
      if (uIndex !== -1) {
        if (bio !== undefined) usersCollection[uIndex].bio = bio;
        if (avatarUrl !== undefined) usersCollection[uIndex].avatarUrl = avatarUrl;
        if (coverUrl !== undefined) usersCollection[uIndex].coverUrl = coverUrl;
        saveDb();
        res.json({ success: true, photographer: { id, name: usersCollection[uIndex].name } });
        return;
      }
    }

    const index = photographersCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photographer not found" });
      return;
    }

    if (name) {
      const nameTrimmed = name.trim();
      const normNew = normalizeName(nameTrimmed);
      const anotherExistsInExplicit = photographersCollection.some(p => p.id !== id && normalizeName(p.name) === normNew);
      const anotherExistsInUsers = usersCollection.some(u => u.isPhotographer && normalizeName(u.name) === normNew);
      if (anotherExistsInExplicit || anotherExistsInUsers) {
        res.status(400).json({ error: "A photographer with this name already exists" });
        return;
      }
      photographersCollection[index].name = nameTrimmed;
    }
    if (avatarUrl !== undefined) photographersCollection[index].avatarUrl = avatarUrl.trim();
    if (coverUrl !== undefined) photographersCollection[index].coverUrl = coverUrl.trim();
    if (bio !== undefined) photographersCollection[index].bio = bio.trim();
    if (status !== undefined) {
      (photographersCollection[index] as any).status = status;
    }

    saveDb();
    res.json({ success: true, photographer: photographersCollection[index] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/photographers/:id", (req, res) => {
  try {
    const { id } = req.params;

    if (id.startsWith("usr_")) {
      const realUserId = id.replace("usr_", "");
      const uIndex = usersCollection.findIndex(u => u.id === realUserId);
      if (uIndex !== -1) {
        usersCollection[uIndex].isPhotographer = false;
        saveDb();
        res.json({ success: true, removed: { id, name: usersCollection[uIndex].name } });
        return;
      }
    }

    const index = photographersCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photographer not found" });
      return;
    }

    const removed = photographersCollection.splice(index, 1)[0];
    saveDb();
    res.json({ success: true, removed });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// App Settings endpoints
app.get("/api/settings", (req, res) => {
  try {
    res.json(appSettings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/settings", (req, res) => {
  try {
    const { linkedInUrl, embedCode } = req.body;
    if (typeof linkedInUrl === "string") {
      appSettings.linkedInUrl = linkedInUrl;
    }
    if (typeof embedCode === "string") {
      appSettings.embedCode = embedCode;
    }
    saveDb();
    res.json({ success: true, settings: appSettings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Get all photos
app.get("/api/images", (req, res) => {
  try {
    res.json(photosCollection);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Add a new photo manually or from submission
app.post("/api/images", requireAuth, (req, res) => {
  try {
    const newPhoto: Photo = req.body;
    if (!newPhoto.id || !newPhoto.url || !newPhoto.title) {
      res.status(400).json({ error: "Missing required fields: id, url, title" });
      return;
    }
    
    // Save image payload locally to prevent DB bloat
    newPhoto.url = saveBase64Image(newPhoto.url, newPhoto.id);
    
    // Default status to Pending (requires admin approval)
    // and initialize views to 0
    newPhoto.status = newPhoto.status || "Pending";
    newPhoto.views = newPhoto.views || 0;
    newPhoto.downloads = newPhoto.downloads || 0;
    newPhoto.dateUploaded = newPhoto.dateUploaded || new Date().toISOString().split("T")[0];
    if (!newPhoto.reactions) {
      newPhoto.reactions = { like: 0, love: 0, inspiring: 0 };
    }
    
    // Check for duplicate
    const index = photosCollection.findIndex(p => p.id === newPhoto.id);
    const isNewPhoto = index === -1;
    if (!isNewPhoto) {
      photosCollection[index] = { ...photosCollection[index], ...newPhoto }; // update
    } else {
      photosCollection.unshift(newPhoto); // prepend so newest uploads are on top
    }

    const savedPhoto = photosCollection[index !== -1 ? index : 0];

    // Notification Triggers for Upload
    if (isNewPhoto) {
      if (savedPhoto.status === "Pending") {
        // Notify Admins & Archive Managers that approval is needed
        usersCollection.forEach((u) => {
          if (["super_admin", "archive_manager"].includes(u.role)) {
            if (!u.notifications) u.notifications = [];
            u.notifications.unshift({
              id: `notif_pending_${savedPhoto.id}_${Date.now()}`,
              message: `Action Needed: New pending photo "${savedPhoto.title}" was uploaded by ${savedPhoto.uploadedBy || "a contributor"}.`,
              read: false,
              timestamp: new Date().toISOString(),
              photoId: savedPhoto.id
            });
          }
        });
      } else if (savedPhoto.status === "Approved") {
        // Notify all other roles that a new image was dropped (auto-approved or uploaded by admin)
        usersCollection.forEach((u) => {
          const isUploader = savedPhoto.uploadedBy && u.email.toLowerCase() === savedPhoto.uploadedBy.toLowerCase();
          if (!isUploader) {
            if (!u.notifications) u.notifications = [];
            u.notifications.unshift({
              id: `notif_drop_${savedPhoto.id}_${Date.now()}`,
              message: `New Image Drop: "${savedPhoto.title}" by ${savedPhoto.photographer} is now live!`,
              read: false,
              timestamp: new Date().toISOString(),
              photoId: savedPhoto.id
            });
          }
        });
      }
    }

    logAction(savedPhoto.uploadedBy || "anonymous@chcsyria.org", "upload", `Uploaded photo '${savedPhoto.title}' (ID: ${savedPhoto.id})`);

    // Persist changes to disk data store
    saveDb();

    res.json({ success: true, photo: savedPhoto });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2.2 Add multiple photos in bulk
app.post("/api/images/bulk", requireAuth, (req, res) => {
  try {
    const newPhotos: Photo[] = req.body;
    if (!Array.isArray(newPhotos)) {
      res.status(400).json({ error: "Expected an array of photos" });
      return;
    }

    const savedPhotos: Photo[] = [];
    let isNewBulk = false;
    for (const photo of newPhotos) {
      if (!photo.id || !photo.url || !photo.title) {
        continue; // skip malformed
      }

      // Save base64 payload to local uploads static storage to avoid database bloat
      photo.url = saveBase64Image(photo.url, photo.id);

      photo.status = photo.status || "Pending";
      photo.views = photo.views || 0;
      photo.downloads = photo.downloads || 0;
      photo.dateUploaded = photo.dateUploaded || new Date().toISOString().split("T")[0];
      if (!photo.reactions) {
        photo.reactions = { like: 0, love: 0, inspiring: 0 };
      }

      const index = photosCollection.findIndex(p => p.id === photo.id);
      if (index !== -1) {
        photosCollection[index] = { ...photosCollection[index], ...photo };
        savedPhotos.push(photosCollection[index]);
      } else {
        photosCollection.unshift(photo);
        savedPhotos.push(photo);
        isNewBulk = true;
      }
    }

    // Notification triggers for bulk upload
    if (isNewBulk && savedPhotos.length > 0) {
      const pendingCount = savedPhotos.filter(p => p.status === "Pending").length;
      const approvedCount = savedPhotos.filter(p => p.status === "Approved").length;
      const uploaderEmail = savedPhotos[0]?.uploadedBy || "a contributor";

      if (pendingCount > 0) {
        usersCollection.forEach((u) => {
          if (!u || !u.role) return;
          if (["super_admin", "archive_manager"].includes(u.role)) {
            if (!u.notifications) u.notifications = [];
            u.notifications.unshift({
              id: `notif_pending_bulk_${Date.now()}`,
              message: `Action Needed: ${pendingCount} new pending photos uploaded by ${uploaderEmail} are awaiting approval.`,
              read: false,
              timestamp: new Date().toISOString()
            });
          }
        });
      }
      if (approvedCount > 0) {
        usersCollection.forEach((u) => {
          if (!u || !u.email) return;
          const isUploader = uploaderEmail && u.email.toLowerCase() === uploaderEmail.toLowerCase();
          if (!isUploader) {
            if (!u.notifications) u.notifications = [];
            u.notifications.unshift({
              id: `notif_drop_bulk_${Date.now()}`,
              message: `New Image Drop: ${approvedCount} new photos have been added to the catalog!`,
              read: false,
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    }

    if (savedPhotos.length > 0) {
      const uploaderEmail = savedPhotos[0]?.uploadedBy || "anonymous@chcsyria.org";
      logAction(uploaderEmail, "upload", `Uploaded ${savedPhotos.length} photos in bulk`);
    }

    // Persist changes to disk data store
    saveDb();

    res.json({ success: true, count: savedPhotos.length, photos: savedPhotos });
  } catch (error: any) {
    console.error("[BULK UPLOAD SERVER ERROR]:", error);
    res.status(500).json({ error: error.message });
  }
});

// Increment views for a photo
app.post("/api/images/:id/view", (req, res) => {
  try {
    const { id } = req.params;
    const index = photosCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    const photo = photosCollection[index];
    photo.views = (photo.views || 0) + 1;
    saveDb();
    res.json({ success: true, views: photo.views });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Increment downloads for a photo
app.post("/api/images/:id/download", (req, res) => {
  try {
    const { id } = req.params;
    const index = photosCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    const photo = photosCollection[index];
    photo.downloads = (photo.downloads || 0) + 1;
    saveDb();
    res.json({ success: true, downloads: photo.downloads });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy route for fetching external images to avoid canvas taint / CORS
app.get("/api/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      res.status(400).send("URL parameter is required");
      return;
    }
    
    // For local data-urls (if any) or local uploads
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("/")) {
      res.redirect(imageUrl);
      return;
    }

    const response = await fetch(imageUrl);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// Serve the main website logo and icons
app.get(["/1.png", "/assets/1.png", "/logo.svg"], (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.sendFile(path.join(process.cwd(), "public", "logo.svg"));
});

// Approve a photo
app.post("/api/images/:id/approve", (req, res) => {
  try {
    const { id } = req.params;
    const index = photosCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    
    const approvedPhoto = photosCollection[index];
    approvedPhoto.status = "Approved";

    const adminEmail = (req.headers["x-user-email"] || req.query.userEmail || req.body.adminEmail || "admin@chcsyria.org") as string;
    logAction(adminEmail, "approve", `Approved photo '${approvedPhoto.title}' (ID: ${approvedPhoto.id})`);

    // Send a notification to the contributor who uploaded it
    if (approvedPhoto.uploadedBy) {
      const uploader = usersCollection.find(u => u.email.toLowerCase() === approvedPhoto.uploadedBy?.toLowerCase());
      if (uploader) {
        if (!uploader.notifications) uploader.notifications = [];
        uploader.notifications.unshift({
          id: `notif_${Date.now()}`,
          message: `Your photo "${approvedPhoto.title}" has been approved and is now live in the public catalog!`,
          read: false,
          timestamp: new Date().toISOString(),
          photoId: approvedPhoto.id
        });
      }
    }

    // Notify all other users of the New Image Drop
    usersCollection.forEach((u) => {
      const isUploader = approvedPhoto.uploadedBy && u.email.toLowerCase() === approvedPhoto.uploadedBy.toLowerCase();
      if (!isUploader) {
        if (!u.notifications) u.notifications = [];
        u.notifications.unshift({
          id: `notif_drop_${approvedPhoto.id}_${Date.now()}`,
          message: `New Image Drop: "${approvedPhoto.title}" by ${approvedPhoto.photographer} is now live!`,
          read: false,
          timestamp: new Date().toISOString(),
          photoId: approvedPhoto.id
        });
      }
    });

    res.json({ success: true, photo: approvedPhoto });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// React to a photo (like, love, inspiring)
app.post("/api/images/:id/react", (req, res) => {
  try {
    const { id } = req.params;
    const { type, userEmail } = req.body; // "like" | "love" | "inspiring", plus userEmail
    
    if (!type || !["like", "love", "inspiring"].includes(type)) {
      res.status(400).json({ error: "Invalid reaction type. Must be 'like', 'love', or 'inspiring'." });
      return;
    }

    const index = photosCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    const photo = photosCollection[index];
    if (!photo.reactions) {
      photo.reactions = { like: 0, love: 0, inspiring: 0 };
    }

    if (!photo.userReactions) {
      photo.userReactions = { like: [], love: [], inspiring: [] };
    }
    if (!photo.userReactions.like) photo.userReactions.like = [];
    if (!photo.userReactions.love) photo.userReactions.love = [];
    if (!photo.userReactions.inspiring) photo.userReactions.inspiring = [];

    const rKey = type as "like" | "love" | "inspiring";

    if (userEmail) {
      const email = userEmail.toLowerCase().trim();
      const reactedList = photo.userReactions[rKey] || [];
      const userIdx = reactedList.indexOf(email);

      if (userIdx > -1) {
        // Toggle OFF
        reactedList.splice(userIdx, 1);
        photo.reactions[rKey] = Math.max(0, (photo.reactions[rKey] || 0) - 1);
      } else {
        // Toggle ON
        reactedList.push(email);
        photo.reactions[rKey] = (photo.reactions[rKey] || 0) + 1;
      }
      photo.userReactions[rKey] = reactedList;
    } else {
      photo.reactions[rKey] = (photo.reactions[rKey] || 0) + 1;
    }
    
    saveDb();
    res.json({ success: true, reactions: photo.reactions, userReactions: photo.userReactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update personal profile (bio, avatar, cover, organization, name)
app.put("/api/users/:id/profile", (req, res) => {
  try {
    const { id } = req.params;
    const { bio, avatarUrl, coverUrl, coverOffsetY, organization, name } = req.body;

    const index = usersCollection.findIndex(u => u.id === id);
    if (index === -1) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = usersCollection[index];
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (coverUrl !== undefined) user.coverUrl = coverUrl;
    if (coverOffsetY !== undefined) user.coverOffsetY = coverOffsetY;
    if (organization !== undefined) user.organization = organization;
    if (name !== undefined && name.trim()) {
      user.name = formatUsername(name);
    }

    saveDb();
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
app.post("/api/users/:id/notifications/read", (req, res) => {
  try {
    const { id } = req.params;
    const { notificationId } = req.body; // Optional specific notification ID, otherwise mark all

    const index = usersCollection.findIndex(u => u.id === id);
    if (index === -1) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = usersCollection[index];
    if (user.notifications) {
      if (notificationId) {
        user.notifications = user.notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        );
      } else {
        user.notifications = user.notifications.map(n => ({ ...n, read: true }));
      }
    }

    saveDb();
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle/Set Featured cover status of a photo (Admins only)
app.post("/api/images/:id/feature", (req, res) => {
  try {
    const { id } = req.params;
    const { feature } = req.body; // boolean
    
    const index = photosCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    if (feature) {
      // Unfeature all other photos
      photosCollection.forEach((p) => {
        p.isFeatured = false;
      });
      photosCollection[index].isFeatured = true;
    } else {
      photosCollection[index].isFeatured = false;
    }

    const adminEmail = (req.headers["x-user-email"] || req.query.userEmail || req.body.adminEmail || "admin@chcsyria.org") as string;
    const photoTitle = photosCollection[index].title;
    if (feature) {
      logAction(adminEmail, "new_cover", `Set photo '${photoTitle}' (ID: ${id}) as featured cover image`);
    } else {
      logAction(adminEmail, "new_cover", `Unset photo '${photoTitle}' (ID: ${id}) as featured cover image`);
    }

    res.json({ success: true, photos: photosCollection });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Update an existing photo's details
app.put("/api/images/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updatedFields = req.body;
    const index = photosCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    photosCollection[index] = { ...photosCollection[index], ...updatedFields };
    saveDb();
    res.json({ success: true, photo: photosCollection[index] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Delete a photo
app.delete("/api/images/:id", (req, res) => {
  try {
    const { id } = req.params;
    const index = photosCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    const removedPhoto = photosCollection[index];
    const adminEmail = (req.headers["x-user-email"] || req.query.userEmail || "admin@chcsyria.org") as string;
    logAction(adminEmail, "delete", `Deleted photo '${removedPhoto.title}' (ID: ${id}) from catalog`);

    const removed = photosCollection.splice(index, 1);
    saveDb();
    res.json({ success: true, removed: removed[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4b. Change photo privacy status (Owner/Admin only)
app.post("/api/images/:id/privacy", (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body; // boolean
    const index = photosCollection.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    photosCollection[index].isPublic = !!isPublic;
    saveDb();
    res.json({ success: true, photo: photosCollection[index] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4c. Get public cover photo for Login page background
app.get("/api/public/cover", (req, res) => {
  try {
    // Find a featured photo or fallback to first photo
    const cover = photosCollection.find(p => p.isFeatured) || photosCollection[0];
    if (!cover) {
      return res.json({
        id: "fallback_cover",
        url: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1600&auto=format&fit=crop&q=80",
        title: "Aleppo Citadel",
        caption: "A magnificent view of the historic Citadel of Aleppo.",
        location: "Citadel of Aleppo, Syria",
        photographer: "Archive Collection",
        dateCreated: "2026-01-01",
        cameraSettings: {
          camera: "Unknown",
          lens: "Unknown",
          iso: 100,
          aperture: "f/8",
          shutterSpeed: "1/250s"
        },
        isPublic: true
      });
    }
    res.json(cover);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4d. Request full resolution photo (Guest only)
app.post("/api/requests/fullres", (req, res) => {
  try {
    const { photoId, photoTitle, photoUrl, userId, userName, userEmail, reason, purpose, requestedSize, withWatermark } = req.body;
    const finalReason = reason || purpose || "";
    const request: FullResRequest = {
      id: `req_${Date.now()}`,
      photoId,
      photoTitle,
      photoUrl,
      userId,
      userName,
      userEmail,
      reason: finalReason,
      purpose: finalReason,
      requestedSize,
      withWatermark,
      status: "Pending",
      createdAt: new Date().toISOString()
    };
    fullResRequests.unshift(request);
    
    // Notify archive managers and admins
    usersCollection.forEach(u => {
      if (["super_admin", "archive_manager"].includes(u.role)) {
        if (!u.notifications) u.notifications = [];
        u.notifications.unshift({
          id: `notif_${Date.now()}`,
          message: `New Full Resolution Download Request for "${photoTitle}" from ${userName}`,
          read: false,
          timestamp: new Date().toISOString(),
          requestId: request.id
        });
      }
    });
    
    saveDb();
    res.json({ success: true, request });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4e. Get all full resolution requests (Owners, Admins, Hosts)
app.get("/api/requests/fullres", (req, res) => {
  try {
    res.json(fullResRequests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4f. Approve full resolution download request
app.post("/api/requests/fullres/:id/approve", (req, res) => {
  try {
    const { id } = req.params;
    const { durationHours } = req.body;
    const reqIndex = fullResRequests.findIndex(r => r.id === id);
    if (reqIndex === -1) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    
    // Parse durationHours, default to 6 if not provided or invalid
    const hours = typeof durationHours === "number" ? durationHours : parseInt(durationHours, 10);
    const finalDuration = !isNaN(hours) && hours > 0 ? hours : 6;
    
    fullResRequests[reqIndex].status = "Approved";
    fullResRequests[reqIndex].approvedAt = new Date().toISOString();
    fullResRequests[reqIndex].durationHours = finalDuration;
    const requestItem = fullResRequests[reqIndex];
    
    // Notify requesting user
    const requester = usersCollection.find(u => u.id === requestItem.userId);
    if (requester) {
      if (!requester.notifications) requester.notifications = [];
      requester.notifications.unshift({
        id: `notif_${Date.now()}`,
        message: `Your special request for the high-resolution download of "${requestItem.photoTitle}" has been APPROVED for ${finalDuration} hours!`,
        read: false,
        timestamp: new Date().toISOString(),
        photoId: requestItem.photoId
      });
    }
    
    saveDb();
    res.json({ success: true, request: requestItem });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4g. Reject full resolution download request
app.post("/api/requests/fullres/:id/reject", (req, res) => {
  try {
    const { id } = req.params;
    const reqIndex = fullResRequests.findIndex(r => r.id === id);
    if (reqIndex === -1) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    
    fullResRequests[reqIndex].status = "Rejected";
    const requestItem = fullResRequests[reqIndex];
    
    // Notify requesting user
    const requester = usersCollection.find(u => u.id === requestItem.userId);
    if (requester) {
      if (!requester.notifications) requester.notifications = [];
      requester.notifications.unshift({
        id: `notif_${Date.now()}`,
        message: `Your special request for the high-resolution download of "${requestItem.photoTitle}" was declined.`,
        read: false,
        timestamp: new Date().toISOString()
      });
    }
    
    saveDb();
    res.json({ success: true, request: requestItem });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Reset to initial photos
app.post("/api/images/reset", (req, res) => {
  try {
    photosCollection = initialPhotos.map((p, i) => ({
      ...p,
      status: p.status || "Approved",
      views: p.views || (24 + Math.floor(Math.random() * 180)),
      downloads: p.downloads || (12 + Math.floor(Math.random() * 60)),
      city: p.city || p.location.split(",")[0].trim(),
      timeCreated: p.timeCreated || `${String(9 + (i % 6)).padStart(2, '0')}:${String((i * 12) % 60).padStart(2, '0')}`,
      dateUploaded: p.dateUploaded || p.dateCreated,
      isFeatured: p.id === "photo_2", // Keep Aleppo featured on reset
      reactions: p.reactions || {
        like: 8 + (i * 3) % 20,
        love: 12 + (i * 4) % 25,
        inspiring: 5 + (i * 2) % 12,
      },
      userReactions: {
        like: [],
        love: [],
        inspiring: [],
      },
      cameraSettings: {
        ...p.cameraSettings,
        focalLength: p.cameraSettings.focalLength || (p.cameraSettings.lens.match(/\d+mm/)?.[0] || "50mm")
      }
    }));
    saveDb();
    res.json({ success: true, photos: photosCollection });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Analyze uploaded photo using Gemini
app.post("/api/analyze", async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      res.status(400).json({ error: "Image base64 and mimeType are required." });
      return;
    }

    const ai = getGeminiClient();
    const photographerNames = photographersCollection.map(p => p.name);

    // Prepare content for Gemini API
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: image,
      },
    };

    const textPart = {
      text: `Analyze this humanitarian photo and generate appropriate archival catalog metadata.
The metadata should represent a realistic entry in the Christian Hope Center Media Space.
Ensure fields represent real world facts from the photo, containing authentic context, sense of community, and hope.`
    };


    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, textPart],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { 
              type: Type.STRING,
              description: "A short, catalog-style uppercase filename or heading (e.g. '001HC_REFUGEE_CARE' or 'MEDICAL_ASSISTANCE_SUMMIT') paired with a beautiful descriptive name." 
            },
            caption: { 
              type: Type.STRING, 
              description: "A detailed, respectful, and descriptive caption (2-3 sentences) detailing who, what, and where, capturing the humanitarian context, sense of community, and hope." 
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Appropriate tags for the image. Must include at least 2 or 3 of these if relevant: 'Relief', 'Community', 'Hope', 'Disaster Relief', 'Education', 'Healthcare', 'Campaigning'."
            },
            photographer: { 
              type: Type.STRING,
              description: `Must be exactly one of these registered photographer names: ${photographerNames.join(", ")}.`
            },
            location: { 
              type: Type.STRING,
              description: "The approximate city/region and country where this photo was likely taken."
            },
            cameraSettings: {
              type: Type.OBJECT,
              properties: {
                camera: { type: Type.STRING, description: "E.g., 'Canon EOS R5' or 'Sony Alpha 7R V' or 'Nikon Z9'" },
                lens: { type: Type.STRING, description: "E.g., 'FE 50mm f/1.2 GM' or 'RF 24-70mm f/2.8L'" },
                iso: { type: Type.STRING, description: "E.g., '100' or '400' or '800'" },
                aperture: { type: Type.STRING, description: "E.g., 'f/1.4' or 'f/2.8' or 'f/4.0'" },
                shutterSpeed: { type: Type.STRING, description: "E.g., '1/250s' or '1/500s'" }
              },
              required: ["camera", "lens", "iso", "aperture", "shutterSpeed"]
            }
          },
          required: ["title", "caption", "keywords", "photographer", "location", "cameraSettings"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No metadata could be extracted from the model response.");
    }

    const metadata = JSON.parse(resultText.trim());
    
    // Safety check fallback: if Gemini somehow returns a name outside the list, default to first photographer
    if (!photographerNames.includes(metadata.photographer)) {
      metadata.photographer = photographerNames[0] || "Sarah Jenkins";
    }

    res.json(metadata);

  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6b. Generate visual alternative text (Alt Text) using Gemini
app.post("/api/generate-alt", async (req, res) => {
  try {
    const { image, mimeType, title, caption, location, keywords } = req.body;
    const ai = getGeminiClient();

    let textPrompt = `Generate a highly descriptive, objective visual alternative text (alt text) for this photo to be used for screen readers and accessibility.
CRITICAL RULES:
1. Describe only what is visually visible (shapes, people, clothing, expressions, colors, objects, setting).
2. DO NOT include narrative, subjective, emotional, or background stories (e.g., do not mention historical context, 'Christian Hope Center', 'humanitarian aid', or 'hope' unless they are explicitly, visually legible text/objects).
3. The alternative text MUST NOT be identical or very similar to the caption. Keep it strictly focused on visual accessibility.
4. Keep it concise but descriptive (1 to 2 sentences, under 150 characters).
`;

    if (caption) {
      textPrompt += `The photo has the following caption (narrative context): "${caption}"\n`;
    }
    if (title) {
      textPrompt += `The photo title is: "${title}"\n`;
    }
    if (location) {
      textPrompt += `Location: "${location}"\n`;
    }
    if (keywords && keywords.length > 0) {
      textPrompt += `Keywords: ${keywords.join(", ")}\n`;
    }

    let response;
    if (image && mimeType) {
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: image,
        },
      };
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, { text: textPrompt }],
      });
    } else {
      textPrompt += "\nGenerate the visual description using the metadata above. Make sure it is purely visual and descriptive of what would be in such a photo.";
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ text: textPrompt }],
      });
    }

    const altText = response.text ? response.text.trim().replace(/^["']|["']$/g, "") : "";
    res.json({ altText });
  } catch (error: any) {
    console.error("Failed to generate alt text via Gemini:", error);
    res.status(500).json({ error: error.message });
  }
});

// Global Error Handler for body-parser issues (e.g. payload too large) or other unhandled errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[GLOBAL SERVER ERROR]:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "An unexpected server error occurred.",
    code: err.code || "SERVER_ERROR"
  });
});

// Vite / static asset serving configuration
const isProd = process.env.NODE_ENV === "production";

async function setupServer() {
  // Await seeding and data loading from Cloud SQL on boot
  await loadDb();

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (isProd: ${isProd})`);
  });
}


setupServer().catch((err) => {
  console.error("Failed to start server:", err);
});
