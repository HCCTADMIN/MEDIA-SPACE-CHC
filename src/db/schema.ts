import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // super_admin, archive_manager, etc.
  status: text("status").notNull(), // Pending, Approved, Rejected
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  coverOffsetY: integer("cover_offset_y"),
  bio: text("bio"),
  organization: text("organization"),
  createdAt: text("created_at"),
  provider: text("provider"), // google, email
  isDeleted: boolean("is_deleted").default(false),
  isPhotographer: boolean("is_photographer").default(false),
});

// Photos Table
export const photos = pgTable("photos", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  caption: text("caption"),
  keywords: text("keywords"), // stored as JSON array string
  photographer: text("photographer").notNull(),
  location: text("location"),
  dateCreated: text("date_created"),
  camera: text("camera"),
  lens: text("lens"),
  iso: text("iso"),
  aperture: text("aperture"),
  shutterSpeed: text("shutter_speed"),
  focalLength: text("focal_length"),
  status: text("status").default("Approved"), // Pending, Approved, Rejected
  views: integer("views").default(0),
  downloads: integer("downloads").default(0),
  city: text("city"),
  countryOrRegion: text("country_or_region"),
  originalFileName: text("original_file_name"),
  copyright: text("copyright"),
  creator: text("creator"),
  altText: text("alt_text"),
  serialNumber: text("serial_number"),
  uploaderName: text("uploader_name"),
  timeCreated: text("time_created"),
  dateUploaded: text("date_uploaded"),
  isFeatured: boolean("is_featured").default(false),
  coverOffsetY: integer("cover_offset_y"),
  collection: text("collection"),
  uploadedBy: text("uploaded_by"), // email of user
  isPublic: boolean("is_public").default(true),
  reactionsLike: integer("reactions_like").default(0),
  reactionsLove: integer("reactions_love").default(0),
  reactionsInspiring: integer("reactions_inspiring").default(0),
  userReactionsLike: text("user_reactions_like"), // stored as JSON array string
  userReactionsLove: text("user_reactions_love"), // stored as JSON array string
  userReactionsInspiring: text("user_reactions_inspiring"), // stored as JSON array string
});

// App Settings Table
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  linkedInUrl: text("linkedin_url"),
  embedCode: text("embed_code"),
});

// Full Res Requests Table
export const fullResRequests = pgTable("full_res_requests", {
  id: text("id").primaryKey(),
  photoId: text("photo_id"),
  photoTitle: text("photo_title"),
  photoUrl: text("photo_url"),
  userId: text("user_id"),
  userEmail: text("user_email"),
  userName: text("user_name"),
  reason: text("reason"),
  purpose: text("purpose"),
  status: text("status").default("Pending"), // Pending, Approved, Rejected
  createdAt: text("created_at"),
  approvedAt: text("approved_at"),
  durationHours: integer("duration_hours"),
  requestedSize: text("requested_size"), // small, medium, original
  withWatermark: boolean("with_watermark").default(true),
});

// Action Logs Table
export const actionLogs = pgTable("action_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  userEmail: text("user_email"),
  action: text("action"), // upload, delete, approve, new_cover
  details: text("details"),
  timestamp: text("timestamp"),
});

// Collections Table
export const collections = pgTable("collections", {
  name: text("name").primaryKey(),
  description: text("description"),
});

// Photographers Table
export const photographers = pgTable("photographers", {
  id: text("id").primaryKey(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  bio: text("bio"),
  joinedDate: text("joined_date"),
  status: text("status").default("Approved"), // Pending, Approved, Rejected
});
