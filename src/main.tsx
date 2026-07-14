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

  // Return a Proxy of the Response to safely catch JSON parsing errors without mutating native properties
  return new Proxy(res, {
    get(target, prop, receiver) {
      if (prop === 'json') {
        return async function () {
          try {
            // Clone the response first to keep the original body stream intact
            const cloned = target.clone();
            const text = await cloned.text();
            return text ? JSON.parse(text) : {};
          } catch (e) {
            // Handle non-JSON responses (like Vercel HTML error pages) gracefully
            return {
              error: `Server responded with status ${target.status}. (Response was not valid JSON).`,
              status: target.status,
              isNonJsonError: true
            };
          }
        };
      }
      
      const value = Reflect.get(target, prop);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
  });
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
