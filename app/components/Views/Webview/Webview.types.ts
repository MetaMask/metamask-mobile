/**
 * Webview navigation parameters
 */

/** Webview parameters */
export interface WebviewParams {
  screen?: string;
  params?: {
    url?: string;
    title?: string;
  };
}

/** Simple webview parameters */
export interface SimpleWebviewParams {
  url?: string;
  title?: string;
}
