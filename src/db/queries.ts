import { db } from "./index.ts";
import { photos, users, appSettings, fullResRequests, actionLogs, collections, photographers } from "./schema.ts";
import { eq, desc } from "drizzle-orm";
import { Photo, UserAccount, FullResRequest, ActionLog, Photographer } from "../types.ts";

// Helper to safely parse JSON strings
function safeParseJSON<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch (_) {
    return fallback;
  }
}

// ------------------------------------------
// Photo Queries
// ------------------------------------------
export async function getPhotosFromDb(): Promise<Photo[]> {
  try {
    const rawPhotos = await db.select().from(photos);
    return rawPhotos.map((p) => ({
      id: p.id,
      url: p.url,
      title: p.title,
      caption: p.caption || "",
      keywords: safeParseJSON<string[]>(p.keywords, []),
      photographer: p.photographer,
      location: p.location || "",
      dateCreated: p.dateCreated || "",
      cameraSettings: {
        camera: p.camera || "",
        lens: p.lens || "",
        iso: p.iso || "",
        aperture: p.aperture || "",
        shutterSpeed: p.shutterSpeed || "",
        focalLength: p.focalLength || "",
      },
      status: p.status as "Pending" | "Approved" | "Rejected",
      views: p.views ?? 0,
      downloads: p.downloads ?? 0,
      city: p.city || "",
      countryOrRegion: p.countryOrRegion || "",
      originalFileName: p.originalFileName || "",
      copyright: p.copyright || "",
      creator: p.creator || "",
      altText: p.altText || "",
      serialNumber: p.serialNumber || "",
      uploaderName: p.uploaderName || "",
      timeCreated: p.timeCreated || "",
      dateUploaded: p.dateUploaded || "",
      isFeatured: p.isFeatured ?? false,
      coverOffsetY: p.coverOffsetY ?? 0,
      collection: p.collection || undefined,
      uploadedBy: p.uploadedBy || undefined,
      isPublic: p.isPublic ?? true,
      reactions: {
        like: p.reactionsLike ?? 0,
        love: p.reactionsLove ?? 0,
        inspiring: p.reactionsInspiring ?? 0,
      },
      userReactions: {
        like: safeParseJSON<string[]>(p.userReactionsLike, []),
        love: safeParseJSON<string[]>(p.userReactionsLove, []),
        inspiring: safeParseJSON<string[]>(p.userReactionsInspiring, []),
      },
    }));
  } catch (error) {
    console.error("[DB ERROR] Failed to fetch photos:", error);
    throw new Error("Failed to fetch photos from database.", { cause: error });
  }
}

export async function savePhotoToDb(photo: Photo): Promise<Photo> {
  try {
    const values = {
      id: photo.id,
      url: photo.url,
      title: photo.title,
      caption: photo.caption,
      keywords: JSON.stringify(photo.keywords || []),
      photographer: photo.photographer,
      location: photo.location,
      dateCreated: photo.dateCreated,
      camera: photo.cameraSettings?.camera,
      lens: photo.cameraSettings?.lens,
      iso: String(photo.cameraSettings?.iso || ""),
      aperture: photo.cameraSettings?.aperture,
      shutterSpeed: photo.cameraSettings?.shutterSpeed,
      focalLength: photo.cameraSettings?.focalLength,
      status: photo.status || "Approved",
      views: photo.views ?? 0,
      downloads: photo.downloads ?? 0,
      city: photo.city,
      countryOrRegion: photo.countryOrRegion,
      originalFileName: photo.originalFileName,
      copyright: photo.copyright,
      creator: photo.creator,
      altText: photo.altText,
      serialNumber: photo.serialNumber,
      uploaderName: photo.uploaderName,
      timeCreated: photo.timeCreated,
      dateUploaded: photo.dateUploaded,
      isFeatured: photo.isFeatured || false,
      coverOffsetY: photo.coverOffsetY || 0,
      collection: photo.collection,
      uploadedBy: photo.uploadedBy,
      isPublic: photo.isPublic ?? true,
      reactionsLike: photo.reactions?.like ?? 0,
      reactionsLove: photo.reactions?.love ?? 0,
      reactionsInspiring: photo.reactions?.inspiring ?? 0,
      userReactionsLike: JSON.stringify(photo.userReactions?.like || []),
      userReactionsLove: JSON.stringify(photo.userReactions?.love || []),
      userReactionsInspiring: JSON.stringify(photo.userReactions?.inspiring || []),
    };

    const exists = await db.select({ id: photos.id }).from(photos).where(eq(photos.id, photo.id)).then(r => r.length > 0);

    if (exists) {
      await db.update(photos).set(values).where(eq(photos.id, photo.id));
    } else {
      await db.insert(photos).values(values);
    }
    return photo;
  } catch (error) {
    console.error(`[DB ERROR] Failed to save photo ${photo.id}:`, error);
    throw new Error("Failed to save photo to database.", { cause: error });
  }
}

export async function deletePhotoFromDb(id: string): Promise<void> {
  try {
    await db.delete(photos).where(eq(photos.id, id));
  } catch (error) {
    console.error(`[DB ERROR] Failed to delete photo ${id}:`, error);
    throw new Error("Failed to delete photo from database.", { cause: error });
  }
}

// ------------------------------------------
// User Queries
// ------------------------------------------
export async function getUsersFromDb(): Promise<UserAccount[]> {
  try {
    const rawUsers = await db.select().from(users);
    return rawUsers.map((u) => ({
      id: u.uid, // Client uses string id
      uid: u.uid,
      email: u.email,
      name: u.name,
      role: u.role as any,
      status: u.status as any,
      avatarUrl: u.avatarUrl || undefined,
      coverUrl: u.coverUrl || undefined,
      coverOffsetY: u.coverOffsetY || undefined,
      bio: u.bio || undefined,
      organization: u.organization || undefined,
      createdAt: u.createdAt || "",
      provider: (u.provider as any) || "google",
      isDeleted: u.isDeleted || undefined,
      isPhotographer: u.isPhotographer || undefined,
    }));
  } catch (error) {
    console.error("[DB ERROR] Failed to fetch users:", error);
    throw new Error("Failed to fetch users from database.", { cause: error });
  }
}

export async function saveUserToDb(user: UserAccount): Promise<UserAccount> {
  try {
    const values = {
      uid: user.uid || user.id,
      email: user.email.toLowerCase(),
      name: user.name,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      coverOffsetY: user.coverOffsetY,
      bio: user.bio,
      organization: user.organization,
      createdAt: user.createdAt,
      provider: user.provider || "google",
      isDeleted: user.isDeleted || false,
      isPhotographer: user.isPhotographer || false,
    };

    const exists = await db.select({ uid: users.uid }).from(users).where(eq(users.uid, values.uid)).then(r => r.length > 0);

    if (exists) {
      await db.update(users).set(values).where(eq(users.uid, values.uid));
    } else {
      await db.insert(users).values(values);
    }
    return user;
  } catch (error) {
    console.error(`[DB ERROR] Failed to save user ${user.id}:`, error);
    throw new Error("Failed to save user to database.", { cause: error });
  }
}

export async function deleteUserFromDb(id: string): Promise<void> {
  try {
    await db.delete(users).where(eq(users.uid, id));
  } catch (error) {
    console.error(`[DB ERROR] Failed to delete user ${id}:`, error);
    throw new Error("Failed to delete user from database.", { cause: error });
  }
}

// ------------------------------------------
// Full Res Requests
// ------------------------------------------
export async function getFullResRequestsFromDb(): Promise<FullResRequest[]> {
  try {
    const rawRequests = await db.select().from(fullResRequests);
    return rawRequests.map((r) => ({
      id: r.id,
      photoId: r.photoId || "",
      photoTitle: r.photoTitle || "",
      photoUrl: r.photoUrl || "",
      userId: r.userId || "",
      userEmail: r.userEmail || "",
      userName: r.userName || "",
      reason: r.reason || "",
      purpose: r.purpose || undefined,
      status: r.status as any,
      createdAt: r.createdAt || "",
      approvedAt: r.approvedAt || undefined,
      durationHours: r.durationHours || undefined,
      requestedSize: r.requestedSize as any,
      withWatermark: r.withWatermark ?? true,
    }));
  } catch (error) {
    console.error("[DB ERROR] Failed to fetch full resolution requests:", error);
    throw new Error("Failed to fetch full resolution requests from database.", { cause: error });
  }
}

export async function saveFullResRequestToDb(req: FullResRequest): Promise<FullResRequest> {
  try {
    const values = {
      id: req.id,
      photoId: req.photoId,
      photoTitle: req.photoTitle,
      photoUrl: req.photoUrl,
      userId: req.userId,
      userEmail: req.userEmail,
      userName: req.userName,
      reason: req.reason,
      purpose: req.purpose,
      status: req.status,
      createdAt: req.createdAt,
      approvedAt: req.approvedAt,
      durationHours: req.durationHours,
      requestedSize: req.requestedSize,
      withWatermark: req.withWatermark,
    };

    const exists = await db.select({ id: fullResRequests.id }).from(fullResRequests).where(eq(fullResRequests.id, req.id)).then(r => r.length > 0);

    if (exists) {
      await db.update(fullResRequests).set(values).where(eq(fullResRequests.id, req.id));
    } else {
      await db.insert(fullResRequests).values(values);
    }
    return req;
  } catch (error) {
    console.error(`[DB ERROR] Failed to save full-res request ${req.id}:`, error);
    throw new Error("Failed to save request to database.", { cause: error });
  }
}

// ------------------------------------------
// Action Logs
// ------------------------------------------
export async function getActionLogsFromDb(): Promise<ActionLog[]> {
  try {
    const rawLogs = await db.select().from(actionLogs).orderBy(desc(actionLogs.timestamp));
    return rawLogs.map((l) => ({
      id: l.id,
      userId: l.userId || "unknown",
      userEmail: l.userEmail || "",
      action: l.action as any,
      details: l.details || "",
      timestamp: l.timestamp || "",
    }));
  } catch (error) {
    console.error("[DB ERROR] Failed to fetch action logs:", error);
    throw new Error("Failed to fetch action logs from database.", { cause: error });
  }
}

export async function saveActionLogToDb(log: ActionLog): Promise<ActionLog> {
  try {
    await db.insert(actionLogs).values({
      id: log.id,
      userId: log.userId,
      userEmail: log.userEmail,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
    });
    return log;
  } catch (error) {
    console.error(`[DB ERROR] Failed to save action log ${log.id}:`, error);
    throw new Error("Failed to save action log to database.", { cause: error });
  }
}

// ------------------------------------------
// Collections
// ------------------------------------------
export async function getCollectionsFromDb(): Promise<{ name: string; description: string }[]> {
  try {
    return await db.select().from(collections);
  } catch (error) {
    console.error("[DB ERROR] Failed to fetch collections:", error);
    throw new Error("Failed to fetch collections from database.", { cause: error });
  }
}

export async function saveCollectionToDb(col: { name: string; description: string }): Promise<void> {
  try {
    const exists = await db.select({ name: collections.name }).from(collections).where(eq(collections.name, col.name)).then(r => r.length > 0);
    if (!exists) {
      await db.insert(collections).values({
        name: col.name,
        description: col.description,
      });
    }
  } catch (error) {
    console.error(`[DB ERROR] Failed to save collection ${col.name}:`, error);
    throw new Error("Failed to save collection to database.", { cause: error });
  }
}

// ------------------------------------------
// Photographers
// ------------------------------------------
export async function getPhotographersFromDb(): Promise<Photographer[]> {
  try {
    const rawPhotographers = await db.select().from(photographers);
    return rawPhotographers.map((p) => ({
      id: p.id,
      name: p.name || "",
      avatarUrl: p.avatarUrl || "",
      coverUrl: p.coverUrl || "",
      bio: p.bio || "",
      joinedDate: p.joinedDate || undefined,
      status: p.status as any,
    }));
  } catch (error) {
    console.error("[DB ERROR] Failed to fetch photographers:", error);
    throw new Error("Failed to fetch photographers from database.", { cause: error });
  }
}

export async function savePhotographerToDb(ph: Photographer): Promise<Photographer> {
  try {
    const values = {
      id: ph.id,
      name: ph.name,
      avatarUrl: ph.avatarUrl,
      coverUrl: ph.coverUrl,
      bio: ph.bio,
      joinedDate: ph.joinedDate,
      status: ph.status || "Approved",
    };

    const exists = await db.select({ id: photographers.id }).from(photographers).where(eq(photographers.id, ph.id)).then(r => r.length > 0);

    if (exists) {
      await db.update(photographers).set(values).where(eq(photographers.id, ph.id));
    } else {
      await db.insert(photographers).values(values);
    }
    return ph;
  } catch (error) {
    console.error(`[DB ERROR] Failed to save photographer ${ph.id}:`, error);
    throw new Error("Failed to save photographer to database.", { cause: error });
  }
}

export async function deletePhotographerFromDb(id: string): Promise<void> {
  try {
    await db.delete(photographers).where(eq(photographers.id, id));
  } catch (error) {
    console.error(`[DB ERROR] Failed to delete photographer ${id}:`, error);
    throw new Error("Failed to delete photographer from database.", { cause: error });
  }
}

// ------------------------------------------
// App Settings
// ------------------------------------------
export async function getAppSettingsFromDb(): Promise<{ linkedInUrl: string; embedCode: string }> {
  try {
    const res = await db.select().from(appSettings).limit(1);
    if (res.length > 0) {
      return {
        linkedInUrl: res[0].linkedInUrl || "https://sy.linkedin.com/company/hcsyria",
        embedCode: res[0].embedCode || "",
      };
    }
    return { linkedInUrl: "https://sy.linkedin.com/company/hcsyria", embedCode: "" };
  } catch (error) {
    console.error("[DB ERROR] Failed to fetch app settings:", error);
    throw new Error("Failed to fetch app settings from database.", { cause: error });
  }
}

export async function saveAppSettingsToDb(settings: { linkedInUrl: string; embedCode: string }): Promise<void> {
  try {
    const res = await db.select({ id: appSettings.id }).from(appSettings).limit(1);
    if (res.length > 0) {
      await db.update(appSettings).set({
        linkedInUrl: settings.linkedInUrl,
        embedCode: settings.embedCode,
      }).where(eq(appSettings.id, res[0].id));
    } else {
      await db.insert(appSettings).values({
        linkedInUrl: settings.linkedInUrl,
        embedCode: settings.embedCode,
      });
    }
  } catch (error) {
    console.error("[DB ERROR] Failed to save app settings:", error);
    throw new Error("Failed to save app settings to database.", { cause: error });
  }
}
