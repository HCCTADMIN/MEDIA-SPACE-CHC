/**
 * Shared types for HCSyria Media Space
 */

export type UserRole = "super_admin" | "archive_manager" | "photographer" | "internal_member" | "external_user";
export type UserStatus = "Pending" | "Approved" | "Rejected";

export interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  timestamp: string;
  photoId?: string;
  requestId?: string;
}

export interface FullResRequest {
  id: string;
  photoId: string;
  photoTitle: string;
  photoUrl: string;
  userId: string;
  userEmail: string;
  userName: string;
  reason: string;
  purpose?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  approvedAt?: string;
  durationHours?: number;
  requestedSize?: "small" | "medium" | "original";
  withWatermark?: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  emailVerified?: boolean;
  verificationCode?: string;
  name: string; // name.surname format
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  coverUrl?: string;
  coverOffsetY?: number; // Y offset percentage for cover position
  bio?: string;
  organization?: string; // NGO, company or participant info
  createdAt: string;
  provider: "google" | "email";
  notifications?: NotificationItem[];
  isDeleted?: boolean; // Soft delete to keep in logs
  isPhotographer?: boolean; // badge to mark user as a photographer
  resetCode?: string;
  resetCodeExpires?: number;
}

export interface CameraSettings {
  camera: string;
  lens: string;
  iso: string | number;
  aperture: string;
  shutterSpeed: string;
  focalLength?: string; // focal length (e.g., '50mm', '85mm')
}

export interface PhotoReactions {
  like: number;
  love: number;
  inspiring: number;
}

export interface Photo {
  id: string;
  url: string;
  title: string;
  caption: string;
  keywords: string[];
  photographer: string;
  location: string;
  dateCreated: string;
  cameraSettings: CameraSettings;
  status?: "Pending" | "Approved" | "Rejected"; // admin approval status
  views?: number; // count of visits/views
  downloads?: number; // count of downloads
  city?: string; // photo city
  countryOrRegion?: string; // photo country or region
  originalFileName?: string; // original file name, unchangeable, hidden
  originalKeywords?: string[]; // original metadata keywords that cannot be removed
  copyright?: string; // copyright from metadata
  creator?: string; // creator from metadata
  altText?: string; // alternative text from metadata, hidden for search
  serialNumber?: string; // unique, non-duplicated serial number
  uploaderName?: string; // name of the user who uploaded the photo
  timeCreated?: string; // time of take (e.g., '14:30')
  dateUploaded?: string; // date of upload (e.g., '2026-07-02')
  isFeatured?: boolean; // whether this is featured as main cover photo
  coverOffsetY?: number; // Y offset percentage for cover position
  collection?: string; // optional collection name
  uploadedBy?: string; // email of the contributor who uploaded it
  isPublic?: boolean; // whether this photo is viewable by public
  reactions?: PhotoReactions; // likes, loves, inspirings
  userReactions?: {
    like?: string[];
    love?: string[];
    inspiring?: string[];
  };
}

export interface AnalysisResponse {
  title: string;
  caption: string;
  keywords: string[];
  photographer: string;
  location: string;
  cameraSettings: CameraSettings;
}

export interface Photographer {
  id: string;
  name: string;
  avatarUrl: string;
  coverUrl: string;
  bio: string;
  joinedDate?: string;
  status?: "Pending" | "Approved" | "Rejected";
}

