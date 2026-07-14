import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import { db } from "../db/index.ts";
import { users } from "../db/schema.ts";
import { eq } from "drizzle-orm";

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
