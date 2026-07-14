import { getPhotosFromDb, savePhotoToDb, saveCollectionToDb, saveUserToDb, saveAppSettingsToDb } from "./queries.ts";
import { initialPhotos } from "../data/initialPhotos.js";
import { Photo, UserAccount } from "../types.ts";

export async function seedDatabase() {
  try {
    console.log("[SEED] Checking if database needs to be seeded...");

    // 1. Seed App Settings
    const existingPhotos = await getPhotosFromDb();
    if (existingPhotos.length === 0) {
      console.log(`[SEED] Seeding database with ${initialPhotos.length} initial photos...`);
      const mappedPhotos: Photo[] = initialPhotos.map((p: any, i: number) => ({
        ...p,
        status: p.status || "Approved",
        views: p.views || (24 + Math.floor(Math.random() * 180)),
        downloads: p.downloads || (12 + Math.floor(Math.random() * 60)),
        city: p.city || p.location.split(",")[0].trim(),
        timeCreated: p.timeCreated || `${String(9 + (i % 6)).padStart(2, '0')}:${String((i * 12) % 60).padStart(2, '0')}`,
        dateUploaded: p.dateUploaded || p.dateCreated,
        isFeatured: p.id === "photo_2", // Explicitly feature Syrian grandfather and grandson
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

      for (const photo of mappedPhotos) {
        await savePhotoToDb(photo);
      }
      console.log("[SEED] Initial photos seeded successfully.");
    } else {
      console.log(`[SEED] Photos already exist in database (${existingPhotos.length} records). Skipping seeding photos.`);
    }

    // 2. Seed default collections
    const defaultCollections = [
      { name: "Emergency Relief 2026", description: "Direct response and humanitarian aid actions in early 2026." },
      { name: "Children and Education", description: "Fostering hope through schooling, literacy, and child-safe spaces." },
      { name: "Healthcare Outreach", description: "Mobile clinics, dental checkups, and regional hospital support missions." }
    ];
    for (const col of defaultCollections) {
      await saveCollectionToDb(col);
    }

    // 3. Seed default owner user in case it is missing (as a fallback)
    const defaultOwner: UserAccount = {
      id: "user_owner1",
      uid: "user_owner1", // default placeholder/fallback UID
      email: "ct.aleppo2@gmail.com",
      name: "ct.aleppo2",
      role: "super_admin",
      status: "Approved",
      createdAt: "2026-07-02",
      provider: "google",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
      coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
      bio: "Main System Owner & Administrator.",
      organization: "Christian Hope Center Aleppo",
    };
    await saveUserToDb(defaultOwner);

    // 4. Seed default settings
    await saveAppSettingsToDb({
      linkedInUrl: "https://sy.linkedin.com/company/hcsyria",
      embedCode: "",
    });

    console.log("[SEED] Database seeding process completed.");
  } catch (err) {
    console.error("[SEED ERROR] Failed to seed database:", err);
  }
}
