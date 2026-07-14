import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import { db } from "../db/index.ts";
import { users } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const LOCAL_SECRET = process.env.LOCAL_JWT_SECRET || crypto.randomBytes(32).toString("hex");

export function generateLocalToken(uid: string): string {
  const signature = crypto.createHmac("sha256", LOCAL_SECRET).update(uid).digest("hex");
  return `local_${Buffer.from(uid).toString("base64")}.${signature}`;
}

export function verifyLocalToken(token: string): string | null {
  if (!token.startsWith("local_")) return null;
  try {
    const parts = token.substring(6).split(".");
    if (parts.length !== 2) return null;
    const uid = Buffer.from(parts[0], "base64").toString("utf-8");
    const expectedSignature = crypto.createHmac("sha256", LOCAL_SECRET).update(uid).digest("hex");
    if (crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expectedSignature))) {
      return uid;
    }
  } catch (e) {
    console.error("Local token verification error:", e);
  }
  return null;
}

export interface AuthRequest extends Request {
  user?: {
    id: string; // Map to uid (string) for consistency with frontend
    uid: string;
    email: string;
    name: string;
    role: string;
    status: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    organization?: string;
  };
}

// Global authentication middleware to verify Firebase ID tokens
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing authorization header." });
  }

  const token = authHeader.split("Bearer ")[1];

  // 1. Check if custom local token
  if (token && token.startsWith("local_")) {
    const uid = verifyLocalToken(token);
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired custom token." });
    }

    try {
      const dbUser = await db.select().from(users).where(eq(users.uid, uid)).then(r => r[0]);
      if (!dbUser) {
        return res.status(401).json({ error: "Unauthorized: User account not found." });
      }

      req.user = {
        id: dbUser.uid,
        uid: dbUser.uid,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        status: dbUser.status,
        avatarUrl: dbUser.avatarUrl || undefined,
        coverUrl: dbUser.coverUrl || undefined,
        bio: dbUser.bio || undefined,
        organization: dbUser.organization || undefined,
      };
      return next();
    } catch (dbErr: any) {
      console.error("[AUTH] Database query failed for local token:", dbErr);
      return res.status(500).json({ error: "Internal server error authenticating user." });
    }
  }

  // 2. Otherwise, verify via Firebase Admin
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email;
    if (!email) {
      return res.status(400).json({ error: "Invalid token: missing email claim." });
    }

    const uid = decodedToken.uid;
    const name = decodedToken.name || email.split("@")[0];
    const avatarUrl = decodedToken.picture || "";

    // Check if user exists in our SQL database
    let dbUser = await db.select().from(users).where(eq(users.uid, uid)).then(r => r[0]);

    if (!dbUser) {
      // Automatic Owner setup
      const isOwner = email.toLowerCase() === "ct.aleppo2@gmail.com";
      const defaultRole = isOwner ? "super_admin" : "external_user";
      const defaultStatus = isOwner ? "Approved" : "Pending";

      const insertResult = await db.insert(users)
        .values({
          uid,
          email: email.toLowerCase(),
          name,
          role: defaultRole,
          status: defaultStatus,
          avatarUrl,
          createdAt: new Date().toISOString().split("T")[0],
          provider: "google",
        })
        .returning();
      
      dbUser = insertResult[0];
      console.log(`[AUTH] Automatic database registration completed for: ${email}`);
    }

    // Attach user information to request
    req.user = {
      id: dbUser.uid, // use uid as id on client-side to prevent compatibility issues
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      status: dbUser.status,
      avatarUrl: dbUser.avatarUrl || undefined,
      coverUrl: dbUser.coverUrl || undefined,
      bio: dbUser.bio || undefined,
      organization: dbUser.organization || undefined,
    };

    next();
  } catch (error: any) {
    console.error("[AUTH] Firebase token verification failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
  }
};
