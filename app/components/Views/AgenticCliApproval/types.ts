/**
 * Mirror of the hosted approval page's mobile WebView contract.
 *
 * Keep this in sync with the developer-dashboard approval screen contract. When
 * a shared package exists, this should be replaced with an import from that package.
 */

export type Intent = 'login' | 'tx_approve';

/** postMessage protocol — SPA → native (this WebView's `onMessage`). */
export type WebviewToNative =
  | { source: 'mm-cli-mfa'; type: 'approved'; approvalId: string }
  | { source: 'mm-cli-mfa'; type: 'rejected'; approvalId: string }
  | { source: 'mm-cli-mfa'; type: 'error'; approvalId: string; message: string }
  | { source: 'mm-cli-mfa'; type: 'close'; approvalId: string };

/** Navigation params for the AgenticCliApproval screen. */
export interface AgenticCliApprovalParams {
  projectId?: string;
  /** Compatibility alias accepted by the hosted page. */
  approvalId?: string;
  /** Mimir signing signature forwarded from the backend CTA/deeplink. */
  mimirSignature?: string;
  operationType?: Intent | string;
  subjectId?: string;
}

/** Discriminator the SPA stamps on every `postMessage` payload. */
export const MESSAGE_SOURCE = 'mm-cli-mfa' as const;
