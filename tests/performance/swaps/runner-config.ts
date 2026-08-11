/** Returns the non-mutating mm command used to require an active session. */
export function buildMmSessionProbeArgs(): string[] {
  return ['describe-screen'];
}

/** Returns the setup command shown when the required session is missing. */
export function formatMmSessionSetupCommand(metroPort: number): string {
  return `yarn mm launch --metro-port ${metroPort}`;
}
