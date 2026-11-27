// Loads the TradingView Advanced Charts library from window.CONFIG.libraryUrl
// by injecting a <script> tag into the document head.
//
// Mirrors legacy chartLogic.js `loadLibrary()` (lines ~5211-5237) but returns
// a Promise so callers can `await` library readiness in bootstrap.ts.

import {
  setLibraryLoaded,
  setLibraryError,
  isLibraryLoaded,
  getLibraryError,
} from './state';

const CHARTING_LIBRARY_FILE = 'charting_library.js';
export const LIBRARY_LOAD_ERROR_CODE = 'TRADINGVIEW_LIBRARY_LOAD_FAILED';
export const MAX_LIBRARY_LOAD_ATTEMPTS = 2;
export const LIBRARY_LOAD_RETRY_DELAY_MS = 250;

let inflightPromise: Promise<void> | null = null;

export class TradingViewLibraryLoadError extends Error {
  readonly code = LIBRARY_LOAD_ERROR_CODE;
  readonly url: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly online: boolean;
  readonly visibilityState: string;

  constructor(url: string, attempt: number) {
    super(`Failed to load TradingView library. URL: ${url}`);
    this.name = 'TradingViewLibraryLoadError';
    this.url = url;
    this.attempt = attempt;
    this.maxAttempts = MAX_LIBRARY_LOAD_ATTEMPTS;
    this.online = navigator.onLine;
    this.visibilityState = document.visibilityState;
  }
}

/**
 * Loads the TradingView library script. Subsequent calls resolve immediately
 * if the library is already loaded; rejected if a previous load failed.
 * Concurrent calls while the script is still loading share the same promise.
 * A failed request is retried once before the failure becomes sticky.
 */
export function loadTradingViewLibrary(libraryUrl: string): Promise<void> {
  if (isLibraryLoaded()) {
    return Promise.resolve();
  }
  const existingError = getLibraryError();
  if (existingError) {
    return Promise.reject(new Error(existingError));
  }
  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = new Promise<void>((resolve, reject) => {
    const scriptUrl = libraryUrl + CHARTING_LIBRARY_FILE;

    const attemptLoad = (attempt: number): void => {
      const script = document.createElement('script');
      let attemptSettled = false;
      script.type = 'text/javascript';
      script.src = scriptUrl;

      const detachScript = (): void => {
        script.onload = null;
        script.onerror = null;
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      script.onload = (): void => {
        if (attemptSettled) {
          return;
        }
        attemptSettled = true;
        script.onload = null;
        script.onerror = null;
        setLibraryLoaded(true);
        setLibraryError(null);
        inflightPromise = null;
        resolve();
      };

      const handleLoadError = (): void => {
        if (attemptSettled) {
          return;
        }
        attemptSettled = true;
        detachScript();

        if (attempt < MAX_LIBRARY_LOAD_ATTEMPTS) {
          setTimeout(
            () => attemptLoad(attempt + 1),
            LIBRARY_LOAD_RETRY_DELAY_MS,
          );
          return;
        }

        const error = new TradingViewLibraryLoadError(scriptUrl, attempt);
        setLibraryError(error.message);
        inflightPromise = null;
        reject(error);
      };
      script.onerror = handleLoadError;

      try {
        document.head.appendChild(script);
      } catch {
        handleLoadError();
      }
    };

    attemptLoad(1);
  });
  return inflightPromise;
}

/** @internal Exported only for unit tests. */
export function __resetLoadLibraryForTests(): void {
  inflightPromise = null;
}
