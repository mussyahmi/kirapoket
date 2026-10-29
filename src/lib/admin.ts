/**
 * The one admin account. Plain module (no "use client") so server routes can
 * import it without pulling in the client contexts.
 */
export const ADMIN_UID = "UG4u9m0jkUh5xqqloijX1zeprXi2";

/**
 * Messages a guest account gets per day. Mirrors DAILY_LIMIT in
 * functions/src/index.ts, which is the one that actually enforces it; this
 * copy exists only so the admin panel can say what turning access on costs.
 */
export const GUEST_DAILY_LIMIT = 5;
