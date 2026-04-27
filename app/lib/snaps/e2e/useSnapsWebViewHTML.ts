///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { useState, useEffect } from 'react';
import { LaunchArguments } from 'react-native-launch-arguments';
// @ts-expect-error Types are currently broken for this.
import OriginalWebViewHTML from '@metamask/snaps-execution-environments/dist/webpack/webview/index.html';
import { createPatchedSnapsHTML } from './createPatchedSnapsHTML';
import { isTest } from '../../../util/test/utils';

interface LaunchArgs {
  mockServerPort?: string;
}

/**
 * Hook that returns the appropriate Snaps execution environment HTML.
 *
 * In E2E test mode (IS_TEST=true), it returns a patched HTML that intercepts
 * fetch calls and routes them through the mock server.
 *
 * In production mode, it returns the original unmodified HTML.
 *
 * @returns The HTML string to use for the WebView source
 */
export function useSnapsWebViewHTML(): string {
  const [html, setHtml] = useState<string>(OriginalWebViewHTML);

  useEffect(() => {
    if (isTest) {
      // Get mock server port from launch arguments
      const launchArgs = LaunchArguments.value<LaunchArgs>();
      const mockServerPort = launchArgs?.mockServerPort
        ? parseInt(launchArgs.mockServerPort, 10)
        : 8000; // Default fallback port

      // Create patched HTML with fetch interceptor
      const patchedHTML = createPatchedSnapsHTML(mockServerPort);
      setHtml(patchedHTML);

      // eslint-disable-next-line no-console
      console.log(
        '[Snaps E2E] Using patched execution environment with mock server port:',
        mockServerPort,
      );
    }
  }, []);

  return html;
}

/**
 * Get the Snaps WebView HTML synchronously.
 * Useful for non-hook contexts.
 *
 * @param mockServerPort - The mock server port (only used in E2E mode)
 * @returns The HTML string to use for the WebView source
 */
export function getSnapsWebViewHTML(mockServerPort?: number): string {
  if (isTest && mockServerPort) {
    return createPatchedSnapsHTML(mockServerPort);
  }
  return OriginalWebViewHTML;
}

export default useSnapsWebViewHTML;
///: END:ONLY_INCLUDE_IF
