// Vitest runs in a plain Node environment without Next's "react-server"
// resolve condition, so the real `server-only` package always throws. This
// stub lets server-only modules (e.g. src/lib/google-calendar.ts) be unit
// tested without weakening the real guard used by the Next.js build.
export {};
