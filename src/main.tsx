import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initMockApi } from './mockApi';

// Self-healing: clear any stale service workers that could be intercepting API requests
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log("[SW_CLEANUP] Unregistered active service worker:", registration);
    }
  });
}

// Setup a secure fetch wrapper to append the Firebase Auth token to all server API requests
const originalFetch = window.fetch;
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const token = sessionStorage.getItem("firebase_id_token");
  if (token) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      init.headers.set("Authorization", `Bearer ${token}`);
    } else if (Array.isArray(init.headers)) {
      init.headers.push(["Authorization", `Bearer ${token}`]);
    } else {
      (init.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await originalFetch(input, init);

  // Safely wrap the .json() method of the response to survive non-JSON responses (e.g. Vercel 404 HTML, backend crashes)
  // and prevent "body stream already read" errors when accessed multiple times.
  let cachedText: string | null = null;
  let cachedJson: any = null;
  let hasParsed = false;

  const originalJson = res.json.bind(res);

  res.json = async function () {
    if (hasParsed) return cachedJson;
    try {
      if (cachedText === null) {
        cachedText = await res.text();
      }
      cachedJson = cachedText ? JSON.parse(cachedText) : {};
    } catch (e) {
      // Parse failed: Response is likely HTML, plain text, or empty.
      // Build a clean error object describing the situation.
      cachedJson = {
        error: `Server responded with status ${res.status}. (Response was not valid JSON).`,
        status: res.status,
        htmlPreview: cachedText ? cachedText.substring(0, 150) : ""
      };
    }
    hasParsed = true;
    return cachedJson;
  };

  return res;
};

try {
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: customFetch
  });
} catch (e) {
  console.warn("[FETCH] Object.defineProperty on window failed, trying fallback to globalThis:", e);
  try {
    (globalThis as any).fetch = customFetch;
  } catch (err2) {
    console.error("[FETCH] All fetch override methods failed:", err2);
  }
}

// initMockApi(); // Disabled mockApi to route all traffic to the real Cloud SQL Express backend


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
