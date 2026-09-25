/**
 * Verifies that the JavaScript checkout and the installed development binary
 * were built from the same native inputs.
 *
 * The expected fingerprint is generated when Metro starts. The actual
 * fingerprint is stamped into the binary as Expo's runtime version.
 *
 * @param expectedFingerprint - Native fingerprint generated for the JS checkout.
 * @param binaryRuntimeVersion - Runtime version embedded in the installed binary.
 * @throws When Metro serves JS to a binary with different native inputs.
 */
export function assertNativeRuntimeCompatibility(
  expectedFingerprint: string | undefined,
  binaryRuntimeVersion: string | null,
): void {
  if (!expectedFingerprint) {
    return;
  }

  if (expectedFingerprint === binaryRuntimeVersion) {
    return;
  }

  throw new Error(
    [
      'The installed development binary is incompatible with this JavaScript checkout.',
      `Expected native fingerprint: ${expectedFingerprint}`,
      `Installed binary fingerprint: ${binaryRuntimeVersion ?? 'missing'}`,
      'Install a matching GitHub artifact with `yarn install:ios:dev` or `yarn install:android:dev`, then restart Metro.',
    ].join('\n'),
  );
}
