/**
 * Mirror of `mfa-backend/src/types.ts`.
 *
 * Keep this in sync with the backend contract. When the real backend lands
 * in its own repo, this should be replaced with an import from the shared
 * package (e.g. `@metamask/agentic-cli-types`).
 */

export type Intent = 'login' | 'tx_approve';

/** postMessage protocol — SPA → native (this WebView's `onMessage`). */
export type WebviewToNative =
  | { source: 'mm-cli-mfa'; type: 'approved'; sessionId: string }
  | { source: 'mm-cli-mfa'; type: 'rejected'; sessionId: string }
  | { source: 'mm-cli-mfa'; type: 'error'; sessionId: string; message: string }
  | { source: 'mm-cli-mfa'; type: 'close'; sessionId: string };

/** Navigation params for the MfaWebview screen. */
export interface MfaWebviewParams {
  sessionId: string;
  /** Decoded backend base URL (e.g. `http://10.0.2.2:3000` in dev). */
  server: string;
  intent: Intent;
}

/** Discriminator the SPA stamps on every `postMessage` payload. */
export const MESSAGE_SOURCE = 'mm-cli-mfa' as const;
