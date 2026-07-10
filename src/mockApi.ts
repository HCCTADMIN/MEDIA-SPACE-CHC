import { Photo, UserAccount, UserRole, UserStatus, FullResRequest } from "./types";
import { initialPhotos } from "./data/initialPhotos";

// Helper to format names to name.surname format
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

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s\-_.]+/g, " ");
}

// Initial photographers collection
const defaultPhotographers: any[] = [];

const defaultCollections = [
  { name: "Emergency Relief 2026", description: "Direct response and humanitarian aid actions in early 2026." },
  { name: "Children and Education", description: "Fostering hope through schooling, literacy, and child-safe spaces." },
  { name: "Healthcare Outreach", description: "Mobile clinics, dental checkups, and regional hospital support missions." }
];

export function initMockApi() {
  if (typeof window === "undefined") return;

  // Always force-clean user accounts to only contain the owner, to remove other registered demo/sandbox users
  const defaultUsers: UserAccount[] = [
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
  localStorage.setItem("chc_users", JSON.stringify(defaultUsers));

  // Initialize LocalStorage with no demo photos
  localStorage.setItem("chc_photos", JSON.stringify([]));

  // Initialize LocalStorage with no photographers
  localStorage.setItem("chc_photographers", JSON.stringify([]));

  if (!localStorage.getItem("chc_collections")) {
    localStorage.setItem("chc_collections", JSON.stringify(defaultCollections));
  }

  if (!localStorage.getItem("chc_requests")) {
    localStorage.setItem("chc_requests", JSON.stringify([]));
  }

  if (!localStorage.getItem("chc_action_logs")) {
    const initialLogs = [
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
    localStorage.setItem("chc_action_logs", JSON.stringify(initialLogs));
  }

  if (!localStorage.getItem("chc_settings")) {
    localStorage.setItem("chc_settings", JSON.stringify({
      linkedInUrl: "https://sy.linkedin.com/company/hcsyria",
      embedCode: ""
    }));
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  let isServerOffline = false;

  // Global indicator for UI
  (window as any).__VERCEL_MOCK_ACTIVE__ = false;

  async function handleMockRequest(urlStr: string, init?: RequestInit): Promise<Response> {
    (window as any).__VERCEL_MOCK_ACTIVE__ = true;
    const url = new URL(urlStr, window.location.origin);
    const path = url.pathname;
    const method = init?.method?.toUpperCase() || "GET";
    const body = init?.body ? JSON.parse(init.body as string) : null;

    // Local DB Getters & Setters
    const getUsers = (): UserAccount[] => JSON.parse(localStorage.getItem("chc_users") || "[]");
    const saveUsers = (u: UserAccount[]) => localStorage.setItem("chc_users", JSON.stringify(u));
    
    const getPhotos = (): Photo[] => JSON.parse(localStorage.getItem("chc_photos") || "[]");
    const savePhotos = (p: Photo[]) => localStorage.setItem("chc_photos", JSON.stringify(p));

    const getPhotographers = () => JSON.parse(localStorage.getItem("chc_photographers") || "[]");
    const savePhotographers = (p: any[]) => localStorage.setItem("chc_photographers", JSON.stringify(p));

    const getCollections = () => JSON.parse(localStorage.getItem("chc_collections") || "[]");
    const saveCollections = (c: any[]) => localStorage.setItem("chc_collections", JSON.stringify(c));

    const getRequests = (): FullResRequest[] => JSON.parse(localStorage.getItem("chc_requests") || "[]");
    const saveRequests = (r: FullResRequest[]) => localStorage.setItem("chc_requests", JSON.stringify(r));

    const getLogs = () => JSON.parse(localStorage.getItem("chc_action_logs") || "[]");
    const saveLogs = (l: any[]) => localStorage.setItem("chc_action_logs", JSON.stringify(l));

    const getSettings = () => JSON.parse(localStorage.getItem("chc_settings") || "{}");
    const saveSettings = (s: any) => localStorage.setItem("chc_settings", JSON.stringify(s));

    const logAction = (email: string, action: string, details: string) => {
      const u = getUsers().find(usr => usr.email.toLowerCase() === email.toLowerCase());
      const logs = getLogs();
      logs.unshift({
        id: `log_${Date.now()}`,
        userId: u ? u.id : "unknown",
        userEmail: email || "anonymous@chcsyria.org",
        action,
        details,
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);
    };

    const makeJsonResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    };

    console.log(`[MOCK API] Intercepted ${method} ${path}`, body);

    try {
      // 1. Auth Login
      if (path === "/api/auth/login" && method === "POST") {
        const { email, password } = body || {};
        if (!email || !password) return makeJsonResponse({ error: "Email and password are required" }, 400);

        let users = getUsers();
        let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
          return makeJsonResponse({ error: "No account found with this email. Please sign up." }, 401);
        }

        if (user.password !== password) {
          return makeJsonResponse({ error: "Incorrect password." }, 401);
        }

        if (!user.emailVerified) {
          return makeJsonResponse({
            error: "Email not verified.",
            code: "EMAIL_NOT_VERIFIED",
            email: user.email,
            verificationCode: user.verificationCode
          }, 403);
        }

        if (user.status === "Pending") {
          return makeJsonResponse({
            error: "Your account is verified, but pending approval by the owner (ct.aleppo2@gmail.com).",
            code: "PENDING_APPROVAL"
          }, 403);
        }

        if (user.status === "Rejected") {
          return makeJsonResponse({
            error: "Your account registration has been declined by the administrator.",
            code: "REJECTED"
          }, 403);
        }

        return makeJsonResponse({ user, message: "Logged in successfully." });
      }

      // 2. Auth Register
      if (path === "/api/auth/register" && method === "POST") {
        const { email, password, name, role, organization } = body || {};
        if (!email || !password || !name) return makeJsonResponse({ error: "Email, name, and password are required" }, 400);

        let users = getUsers();
        const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) return makeJsonResponse({ error: "This email address is already registered." }, 400);

        const formattedName = formatUsername(name);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser: UserAccount = {
          id: `user_${Date.now()}`,
          email: email.toLowerCase(),
          password,
          emailVerified: false,
          verificationCode,
          name: formattedName,
          role: role || "external_user",
          status: "Pending",
          createdAt: new Date().toISOString().split("T")[0],
          provider: "email",
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`,
          organization: organization || ""
        };

        users.push(newUser);
        saveUsers(users);

        return makeJsonResponse({
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            status: newUser.status,
            provider: newUser.provider,
            emailVerified: newUser.emailVerified
          },
          verificationCode,
          message: "Registration successful. Please verify your email."
        }, 201);
      }

      // 2b. Email Verification
      if (path === "/api/auth/verify-email" && method === "POST") {
        const { email, code } = body || {};
        if (!email || !code) return makeJsonResponse({ error: "Email and verification code are required" }, 400);

        let users = getUsers();
        const uIdx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
        if (uIdx === -1) return makeJsonResponse({ error: "User not found" }, 404);

        const user = users[uIdx];
        if (user.verificationCode !== code) {
          return makeJsonResponse({ error: "Incorrect verification code." }, 400);
        }

        user.emailVerified = true;
        user.verificationCode = undefined;

        // Notify Admins & Archive Managers of pending registration AFTER email is verified
        users.forEach(u => {
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

        saveUsers(users);
        return makeJsonResponse({
          success: true,
          message: "Email verified successfully! Your account is now pending approval by the owner."
        });
      }

      // 3. Action Logs
      if (path === "/api/action-logs" && method === "GET") {
        return makeJsonResponse(getLogs());
      }

      // 4. Collections
      if (path === "/api/collections" && method === "GET") {
        const photos = getPhotos();
        const collections = getCollections();
        const dynamicNames = new Set(photos.map(p => p.collection).filter(Boolean) as string[]);
        collections.forEach((c: any) => dynamicNames.add(c.name));
        const list = Array.from(dynamicNames).map(name => {
          const existing = collections.find((c: any) => c.name === name);
          return {
            name,
            description: existing ? existing.description : "Humanitarian photo collection."
          };
        });
        return makeJsonResponse(list);
      }

      if (path === "/api/collections" && method === "POST") {
        const { name, description } = body || {};
        if (!name) return makeJsonResponse({ error: "Collection name is required" }, 400);
        let collections = getCollections();
        const exists = collections.some((c: any) => c.name.toLowerCase() === name.trim().toLowerCase());
        if (exists) return makeJsonResponse({ error: "Collection already exists" }, 400);

        const newCol = { name: name.trim(), description: description || "Custom user collection." };
        collections.push(newCol);
        saveCollections(collections);
        return makeJsonResponse({ success: true, collection: newCol });
      }

      // 5. Users List
      if (path === "/api/users" && method === "GET") {
        return makeJsonResponse(getUsers());
      }

      // 6. User Profile / Details / Edit
      if (path.startsWith("/api/users/") && !path.includes("/profile") && !path.includes("/notifications") && !path.includes("/deleted-logs")) {
        const id = path.split("/").pop() || "";
        let users = getUsers();
        const uIndex = users.findIndex(u => u.id === id);

        if (method === "GET") {
          const user = users.find(u => u.id === id);
          if (!user) return makeJsonResponse({ error: "User not found" }, 404);
          return makeJsonResponse(user);
        }

        if (method === "PUT") {
          if (uIndex === -1) return makeJsonResponse({ error: "User not found" }, 404);
          const { role, status, isPhotographer } = body || {};
          
          if (role) users[uIndex].role = role;
          if (isPhotographer !== undefined) users[uIndex].isPhotographer = !!isPhotographer;
          if (status) {
            users[uIndex].status = status;
            if (!users[uIndex].notifications) users[uIndex].notifications = [];
            if (status === "Approved") {
              users[uIndex].notifications.unshift({
                id: `notif_approved_${Date.now()}`,
                message: `Your account registration has been approved! Welcome to HCSyria Media Space as a ${users[uIndex].role}.`,
                read: false,
                timestamp: new Date().toISOString()
              });
            } else if (status === "Rejected") {
              users[uIndex].notifications.unshift({
                id: `notif_rejected_${Date.now()}`,
                message: `Your account registration was rejected. Please contact an administrator.`,
                read: false,
                timestamp: new Date().toISOString()
              });
            }
          }
          saveUsers(users);
          return makeJsonResponse({ success: true, user: users[uIndex] });
        }

        if (method === "DELETE") {
          if (uIndex === -1) return makeJsonResponse({ error: "User not found" }, 404);
          users.splice(uIndex, 1);
          saveUsers(users);
          return makeJsonResponse({ success: true });
        }
      }

      // User Profile Update
      if (path.startsWith("/api/users/") && path.endsWith("/profile") && method === "PUT") {
        const segments = path.split("/");
        const id = segments[segments.length - 2];
        let users = getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return makeJsonResponse({ error: "User not found" }, 404);

        const { name: newName, organization, bio, avatarUrl, coverUrl } = body || {};
        if (newName) users[idx].name = formatUsername(newName);
        if (organization !== undefined) users[idx].organization = organization;
        if (bio !== undefined) users[idx].bio = bio;
        if (avatarUrl !== undefined) users[idx].avatarUrl = avatarUrl;
        if (coverUrl !== undefined) users[idx].coverUrl = coverUrl;

        saveUsers(users);
        return makeJsonResponse({ success: true, user: users[idx] });
      }

      // Notifications Mark Read
      if (path.startsWith("/api/users/") && path.endsWith("/notifications/read") && method === "POST") {
        const segments = path.split("/");
        const id = segments[segments.length - 3];
        let users = getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return makeJsonResponse({ error: "User not found" }, 404);

        if (users[idx].notifications) {
          users[idx].notifications.forEach(n => { n.read = true; });
        }
        saveUsers(users);
        return makeJsonResponse({ success: true, user: users[idx] });
      }

      // 7. Photographers
      if (path === "/api/photographers" && method === "GET") {
        const explicitPh = getPhotographers();
        const users = getUsers();
        const list = [...explicitPh];
        const seen = new Set(list.map(p => normalizeName(p.name)));

        users.filter(u => u.isPhotographer).forEach(u => {
          const norm = normalizeName(u.name);
          if (!seen.has(norm)) {
            seen.add(norm);
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
        return makeJsonResponse(list);
      }

      if (path === "/api/photographers" && method === "POST") {
        const { name, avatarUrl, coverUrl, bio, status } = body || {};
        if (!name) return makeJsonResponse({ error: "Photographer name is required" }, 400);

        let explicitPh = getPhotographers();
        const normNew = normalizeName(name);
        const exists = explicitPh.some((p: any) => normalizeName(p.name) === normNew);
        if (exists) return makeJsonResponse({ error: "A photographer with this name already exists." }, 400);

        const newPh = {
          id: `ph_${Date.now()}`,
          name: name.trim(),
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          coverUrl: coverUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
          bio: bio || "Verified photographer identity.",
          joinedDate: new Date().toISOString().split("T")[0],
          status: status || "Approved"
        };
        explicitPh.push(newPh);
        savePhotographers(explicitPh);
        return makeJsonResponse({ success: true, photographer: newPh }, 201);
      }

      if (path.startsWith("/api/photographers/") && method === "PUT") {
        const id = path.split("/").pop() || "";
        const { name, avatarUrl, coverUrl, bio, status } = body || {};

        if (id.startsWith("usr_")) {
          const realUserId = id.replace("usr_", "");
          let users = getUsers();
          const uIdx = users.findIndex(u => u.id === realUserId);
          if (uIdx !== -1) {
            if (bio !== undefined) users[uIdx].bio = bio;
            if (avatarUrl !== undefined) users[uIdx].avatarUrl = avatarUrl;
            if (coverUrl !== undefined) users[uIdx].coverUrl = coverUrl;
            saveUsers(users);
            return makeJsonResponse({ success: true, photographer: { id, name: users[uIdx].name } });
          }
        } else {
          let explicitPh = getPhotographers();
          const pIdx = explicitPh.findIndex((p: any) => p.id === id);
          if (pIdx !== -1) {
            if (name !== undefined) explicitPh[pIdx].name = name;
            if (avatarUrl !== undefined) explicitPh[pIdx].avatarUrl = avatarUrl;
            if (coverUrl !== undefined) explicitPh[pIdx].coverUrl = coverUrl;
            if (bio !== undefined) explicitPh[pIdx].bio = bio;
            if (status !== undefined) explicitPh[pIdx].status = status;
            savePhotographers(explicitPh);
            return makeJsonResponse({ success: true, photographer: explicitPh[pIdx] });
          }
        }
        return makeJsonResponse({ error: "Photographer not found" }, 404);
      }

      if (path.startsWith("/api/photographers/") && method === "DELETE") {
        const id = path.split("/").pop() || "";
        let explicitPh = getPhotographers();
        const pIdx = explicitPh.findIndex((p: any) => p.id === id);
        if (pIdx !== -1) {
          explicitPh.splice(pIdx, 1);
          savePhotographers(explicitPh);
          return makeJsonResponse({ success: true });
        }
        return makeJsonResponse({ error: "Photographer not found" }, 404);
      }

      // 8. General App Settings
      if (path === "/api/settings" && method === "GET") {
        return makeJsonResponse(getSettings());
      }

      if (path === "/api/settings" && method === "PUT") {
        const { linkedInUrl, embedCode } = body || {};
        const settings = getSettings();
        if (linkedInUrl !== undefined) settings.linkedInUrl = linkedInUrl;
        if (embedCode !== undefined) settings.embedCode = embedCode;
        saveSettings(settings);
        return makeJsonResponse({ success: true, settings });
      }

      // 9. Photos / Images Catalog
      if (path === "/api/images" && method === "GET") {
        return makeJsonResponse(getPhotos());
      }

      if (path === "/api/images" && method === "POST") {
        const { title, url, caption, location, city, collection, photographer, dateCreated, cameraSettings, email, keywords } = body || {};
        const photos = getPhotos();
        
        const newPhoto: Photo = {
          id: `photo_${Date.now()}`,
          url: url || "https://images.unsplash.com/photo-1545558014-868c57f627f9?auto=format&fit=crop&w=800&q=80",
          title: title || "UNTITLED PHOTO",
          caption: caption || "",
          keywords: keywords || [],
          location: location || "Aleppo, Syria",
          city: city || location?.split(",")[0]?.trim() || "Aleppo",
          collection: collection || "",
          photographer: photographer || "HCSyria Guest Contributor",
          dateCreated: dateCreated || new Date().toISOString().split("T")[0],
          dateUploaded: new Date().toISOString().split("T")[0],
          timeCreated: new Date().toTimeString().split(" ")[0].substring(0, 5),
          uploadedBy: email || "anonymous@hcsyria.org",
          status: "Pending", // Needs admin approval to go live
          views: 0,
          downloads: 0,
          reactions: { like: 0, love: 0, inspiring: 0 },
          userReactions: { like: [], love: [], inspiring: [] },
          cameraSettings: {
            camera: cameraSettings?.camera || "N/A",
            lens: cameraSettings?.lens || "N/A",
            iso: cameraSettings?.iso || "N/A",
            aperture: cameraSettings?.aperture || "N/A",
            shutterSpeed: cameraSettings?.shutterSpeed || "N/A",
            focalLength: cameraSettings?.focalLength || "N/A"
          }
        };

        photos.unshift(newPhoto);
        savePhotos(photos);
        logAction(email || "anonymous@hcsyria.org", "upload", `Uploaded photo "${newPhoto.title}" (ID: ${newPhoto.id})`);
        return makeJsonResponse({ success: true, photo: newPhoto }, 201);
      }

      // Bulk Upload
      if (path === "/api/images/bulk" && method === "POST") {
        const { photos: incomingPhotos, email } = body || {};
        if (!Array.isArray(incomingPhotos)) return makeJsonResponse({ error: "Invalid photos array" }, 400);

        let photos = getPhotos();
        const uploadedList: Photo[] = [];

        incomingPhotos.forEach((ip: any) => {
          const newPhoto: Photo = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            url: ip.url,
            title: ip.title || "UNTITLED BULK PHOTO",
            caption: ip.caption || "",
            keywords: ip.keywords || [],
            location: ip.location || "Aleppo, Syria",
            city: ip.city || ip.location?.split(",")[0]?.trim() || "Aleppo",
            collection: ip.collection || "",
            photographer: ip.photographer || "HCSyria Contributor",
            dateCreated: ip.dateCreated || new Date().toISOString().split("T")[0],
            dateUploaded: new Date().toISOString().split("T")[0],
            timeCreated: new Date().toTimeString().split(" ")[0].substring(0, 5),
            uploadedBy: email || "anonymous@hcsyria.org",
            status: "Pending",
            views: 0,
            downloads: 0,
            reactions: { like: 0, love: 0, inspiring: 0 },
            userReactions: { like: [], love: [], inspiring: [] },
            cameraSettings: {
              camera: ip.cameraSettings?.camera || "N/A",
              lens: ip.cameraSettings?.lens || "N/A",
              iso: ip.cameraSettings?.iso || "N/A",
              aperture: ip.cameraSettings?.aperture || "N/A",
              shutterSpeed: ip.cameraSettings?.shutterSpeed || "N/A",
              focalLength: ip.cameraSettings?.focalLength || "N/A"
            }
          };
          photos.unshift(newPhoto);
          uploadedList.push(newPhoto);
        });

        savePhotos(photos);
        logAction(email || "anonymous@hcsyria.org", "upload", `Bulk uploaded ${uploadedList.length} photos.`);
        return makeJsonResponse({ success: true, count: uploadedList.length, photos: uploadedList });
      }

      // Reset Catalog
      if (path === "/api/images/reset" && method === "POST") {
        localStorage.removeItem("chc_photos");
        localStorage.removeItem("chc_requests");
        localStorage.removeItem("chc_action_logs");
        // Re-init by calling simple reload or re-running init logic
        setTimeout(() => window.location.reload(), 500);
        return makeJsonResponse({ success: true });
      }

      // Photo view / download count increment
      if (path.startsWith("/api/images/") && path.endsWith("/view") && method === "POST") {
        const id = path.split("/")[3];
        let photos = getPhotos();
        const pIdx = photos.findIndex(p => p.id === id);
        if (pIdx !== -1) {
          photos[pIdx].views = (photos[pIdx].views || 0) + 1;
          savePhotos(photos);
          return makeJsonResponse({ success: true, views: photos[pIdx].views });
        }
      }

      if (path.startsWith("/api/images/") && path.endsWith("/download") && method === "POST") {
        const id = path.split("/")[3];
        let photos = getPhotos();
        const pIdx = photos.findIndex(p => p.id === id);
        if (pIdx !== -1) {
          photos[pIdx].downloads = (photos[pIdx].downloads || 0) + 1;
          savePhotos(photos);
          return makeJsonResponse({ success: true, downloads: photos[pIdx].downloads });
        }
      }

      // Photo approval
      if (path.startsWith("/api/images/") && path.endsWith("/approve") && method === "POST") {
        const id = path.split("/")[3];
        let photos = getPhotos();
        const pIdx = photos.findIndex(p => p.id === id);
        if (pIdx !== -1) {
          photos[pIdx].status = "Approved";
          savePhotos(photos);
          logAction("ct.aleppo2@gmail.com", "approve", `Approved photo "${photos[pIdx].title}" (ID: ${photos[pIdx].id})`);
          return makeJsonResponse({ success: true, photo: photos[pIdx] });
        }
      }

      // Photo feature cover
      if (path.startsWith("/api/images/") && path.endsWith("/feature") && method === "POST") {
        const id = path.split("/")[3];
        let photos = getPhotos();
        photos.forEach(p => { p.isFeatured = p.id === id; });
        savePhotos(photos);
        const active = photos.find(p => p.id === id);
        logAction("ct.aleppo2@gmail.com", "new_cover", `Set photo "${active?.title || id}" (ID: ${id}) as featured cover image`);
        return makeJsonResponse({ success: true, photo: active });
      }

      // Photo reaction
      if (path.startsWith("/api/images/") && path.endsWith("/react") && method === "POST") {
        const id = path.split("/")[3];
        const { type, email } = body || {};
        if (!type || !email) return makeJsonResponse({ error: "Reaction type and email required" }, 400);

        let photos = getPhotos();
        const pIdx = photos.findIndex(p => p.id === id);
        if (pIdx !== -1) {
          const photo = photos[pIdx];
          if (!photo.userReactions) {
            photo.userReactions = { like: [], love: [], inspiring: [] };
          }
          if (!photo.reactions) {
            photo.reactions = { like: 0, love: 0, inspiring: 0 };
          }

          const reactionArray = photo.userReactions[type as "like" | "love" | "inspiring"] || [];
          const userEmailLower = email.toLowerCase();
          const hasReacted = reactionArray.includes(userEmailLower);

          if (hasReacted) {
            // Remove reaction
            photo.userReactions[type as "like" | "love" | "inspiring"] = reactionArray.filter(e => e !== userEmailLower);
            photo.reactions[type as "like" | "love" | "inspiring"] = Math.max(0, (photo.reactions[type as "like" | "love" | "inspiring"] || 1) - 1);
          } else {
            // Add reaction
            reactionArray.push(userEmailLower);
            photo.userReactions[type as "like" | "love" | "inspiring"] = reactionArray;
            photo.reactions[type as "like" | "love" | "inspiring"] = (photo.reactions[type as "like" | "love" | "inspiring"] || 0) + 1;
          }

          savePhotos(photos);
          return makeJsonResponse({ success: true, reactions: photo.reactions, userReactions: photo.userReactions });
        }
      }

      // Photo CRUD (Edit and Delete)
      if (path.startsWith("/api/images/") && method === "PUT") {
        const id = path.split("/").pop() || "";
        let photos = getPhotos();
        const pIdx = photos.findIndex(p => p.id === id);
        if (pIdx !== -1) {
          const { title, caption, keywords, location, city, collection, photographer, cameraSettings } = body || {};
          if (title !== undefined) photos[pIdx].title = title;
          if (caption !== undefined) photos[pIdx].caption = caption;
          if (keywords !== undefined) photos[pIdx].keywords = keywords;
          if (location !== undefined) photos[pIdx].location = location;
          if (city !== undefined) photos[pIdx].city = city;
          if (collection !== undefined) photos[pIdx].collection = collection;
          if (photographer !== undefined) photos[pIdx].photographer = photographer;
          if (cameraSettings !== undefined) {
            photos[pIdx].cameraSettings = {
              ...photos[pIdx].cameraSettings,
              ...cameraSettings
            };
          }
          savePhotos(photos);
          return makeJsonResponse({ success: true, photo: photos[pIdx] });
        }
      }

      if (path.startsWith("/api/images/") && method === "DELETE") {
        const id = path.split("/").pop() || "";
        let photos = getPhotos();
        const pIdx = photos.findIndex(p => p.id === id);
        if (pIdx !== -1) {
          logAction("ct.aleppo2@gmail.com", "delete", `Deleted photo "${photos[pIdx].title}" (ID: ${photos[pIdx].id})`);
          photos.splice(pIdx, 1);
          savePhotos(photos);
          return makeJsonResponse({ success: true });
        }
      }

      // Privacy toggling
      if (path.startsWith("/api/images/") && path.endsWith("/privacy") && method === "POST") {
        const id = path.split("/")[3];
        const { isPublic } = body || {};
        let photos = getPhotos();
        const pIdx = photos.findIndex(p => p.id === id);
        if (pIdx !== -1) {
          const value = isPublic !== undefined ? !!isPublic : !photos[pIdx].isPublic;
          photos[pIdx].isPublic = value;
          savePhotos(photos);
          return makeJsonResponse({ success: true, photo: photos[pIdx] });
        }
      }

      // Public Active featured cover
      if (path === "/api/public/cover" && method === "GET") {
        const photos = getPhotos();
        const featured = photos.find(p => p.isFeatured) || photos[0];
        return makeJsonResponse({
          url: featured?.url || "",
          title: featured?.title || "Aleppo Archive"
        });
      }

      // 10. High-Resolution/Download Requests
      if (path === "/api/requests/fullres") {
        if (method === "GET") {
          return makeJsonResponse(getRequests());
        }

        if (method === "POST") {
          const { photoId, photoTitle, photoUrl, userId, userName, userEmail, reason, purpose, requestedSize, withWatermark } = body || {};
          let requests = getRequests();
          
          const finalReason = reason || purpose || "";
          const newRequest: FullResRequest = {
            id: `req_${Date.now()}`,
            photoId,
            photoTitle,
            photoUrl,
            userId,
            userName,
            userEmail,
            reason: finalReason,
            purpose: finalReason,
            requestedSize: requestedSize || "original",
            withWatermark: withWatermark !== undefined ? withWatermark : true,
            status: "Pending",
            createdAt: new Date().toISOString()
          };

          requests.unshift(newRequest);
          saveRequests(requests);

          // Add notification to admin users
          let users = getUsers();
          users.forEach((u, i) => {
            if (["super_admin", "archive_manager"].includes(u.role)) {
              if (!u.notifications) u.notifications = [];
              u.notifications.unshift({
                id: `notif_req_${newRequest.id}_${Date.now()}`,
                message: `Action Needed: New download request for "${newRequest.photoTitle}" from "${newRequest.userName}".`,
                read: false,
                timestamp: new Date().toISOString()
              });
            }
          });
          saveUsers(users);

          return makeJsonResponse({ success: true, request: newRequest });
        }
      }

      if (path.startsWith("/api/requests/fullres/") && path.endsWith("/approve") && method === "POST") {
        const id = path.split("/")[4];
        const { durationHours } = body || {};
        const finalDuration = typeof durationHours === "number" ? durationHours : 6;

        let requests = getRequests();
        const reqIdx = requests.findIndex(r => r.id === id);

        if (reqIdx !== -1) {
          requests[reqIdx].status = "Approved";
          requests[reqIdx].approvedAt = new Date().toISOString();
          requests[reqIdx].durationHours = finalDuration;
          saveRequests(requests);

          // Notify user
          const rItem = requests[reqIdx];
          let users = getUsers();
          const uIdx = users.findIndex(u => u.id === rItem.userId);
          if (uIdx !== -1) {
            if (!users[uIdx].notifications) users[uIdx].notifications = [];
            users[uIdx].notifications.unshift({
              id: `notif_req_approved_${rItem.id}_${Date.now()}`,
              message: `Your download request for "${rItem.photoTitle}" (${rItem.requestedSize || "original"} size, ${rItem.withWatermark ? "with watermark" : "no watermark"}) has been Approved for the next ${finalDuration} hours!`,
              read: false,
              timestamp: new Date().toISOString()
            });
            saveUsers(users);
          }

          logAction("ct.aleppo2@gmail.com", "approve", `Approved download request ${id} for photo "${rItem.photoTitle}"`);
          return makeJsonResponse({ success: true, request: requests[reqIdx] });
        }
      }

      if (path.startsWith("/api/requests/fullres/") && path.endsWith("/reject") && method === "POST") {
        const id = path.split("/")[4];
        let requests = getRequests();
        const reqIdx = requests.findIndex(r => r.id === id);

        if (reqIdx !== -1) {
          requests[reqIdx].status = "Rejected";
          saveRequests(requests);

          // Notify user
          const rItem = requests[reqIdx];
          let users = getUsers();
          const uIdx = users.findIndex(u => u.id === rItem.userId);
          if (uIdx !== -1) {
            if (!users[uIdx].notifications) users[uIdx].notifications = [];
            users[uIdx].notifications.unshift({
              id: `notif_req_rejected_${rItem.id}_${Date.now()}`,
              message: `Your download request for "${rItem.photoTitle}" (${rItem.requestedSize || "original"} size) was Declined.`,
              read: false,
              timestamp: new Date().toISOString()
            });
            saveUsers(users);
          }

          return makeJsonResponse({ success: true, request: requests[reqIdx] });
        }
      }

      // Mock AI/Alt text generation
      if (path === "/api/analyze" && method === "POST") {
        return makeJsonResponse({
          analysis: "A beautifully framed photograph displaying strong community resilience. Key elements include warm lighting, balanced compositions, and subjects illustrating mutual support and Hope. The image carries profound narrative dignity and historical authenticity."
        });
      }

      if (path === "/api/generate-alt" && method === "POST") {
        return makeJsonResponse({
          altText: "A historical narrative photo showcasing deep heritage and humanitarian hope. Carefully cataloged for archival reference."
        });
      }

    } catch (err: any) {
      console.error("[MOCK API ERROR]", err);
      return makeJsonResponse({ error: err.message }, 500);
    }

    return makeJsonResponse({ error: `Mock API: Path '${path}' [${method}] not matched.` }, 404);
  }

  const newFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);

    if (urlStr.includes("/api/")) {
      if (isServerOffline) {
        return handleMockRequest(urlStr, init);
      }

      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get("content-type") || "";
        
        // Detect if server is not responding with JSON, or returning 404 index.html fallback
        if (contentType.includes("text/html") || response.status === 404) {
          console.warn("[MOCK API INTERCEPT] API endpoint returned HTML or 404. Switching to Client-Side Mock Database...");
          isServerOffline = true;
          return handleMockRequest(urlStr, init);
        }
        return response;
      } catch (error) {
        console.warn("[MOCK API INTERCEPT] Real backend request failed. Switching to Client-Side Mock Database...", error);
        isServerOffline = true;
        return handleMockRequest(urlStr, init);
      }
    }

    return originalFetch(input, init);
  };

  try {
    Object.defineProperty(window, "fetch", {
      value: newFetch,
      configurable: true,
      writable: true
    });
  } catch (e) {
    console.warn("[MOCK API] Failed to overwrite window.fetch with Object.defineProperty, trying direct assignment...", e);
    try {
      window.fetch = newFetch;
    } catch (err2) {
      console.error("[MOCK API] Critical: Could not overwrite window.fetch at all.", err2);
    }
  }
}
