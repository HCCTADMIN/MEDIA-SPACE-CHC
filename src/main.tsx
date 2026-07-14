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
  return originalFetch(input, init);
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
