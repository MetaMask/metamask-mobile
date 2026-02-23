/**
 * Production stub for SnapsE2EProxy.
 * Metro resolves to this file in non-E2E builds so no proxy/mock code is bundled.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const buildE2EProxyPatchScript = (_params: {
  mockServerPort: string;
  platform: string;
  snapId: string;
}): string | undefined => undefined;

export const shouldPatchSnapsWebViewProxy = () => false;

export const getMockServerPortInApp = () => 0;
