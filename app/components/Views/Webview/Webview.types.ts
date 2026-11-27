/**
 * Webview navigation parameters
 */

/** Webview parameters */
export interface WebviewParams {
  screen?: string;
  params?: {
    url?: string;
    title?: string;
    /** Hides the share button in the header */
    hideShareButton?: boolean;
    /** Glass header with a close button instead of a back button */
    useGlassHeader?: boolean;
    /** Optional auth-session ID for intercepting OAuth redirects inside the WebView */
    authSessionId?: string;
  };
}

/** Simple webview parameters */
export interface SimpleWebviewParams {
  url?: string;
  title?: string;
  /** Hides the share button in the header */
  hideShareButton?: boolean;
  /** Glass header with a close button instead of a back button */
  useGlassHeader?: boolean;
  /** Set by navigators that present the webview as an iOS page sheet, which already sits below the status bar */
  isModal?: boolean;
  /** Optional auth-session ID for intercepting OAuth redirects inside the WebView */
  authSessionId?: string;
}
