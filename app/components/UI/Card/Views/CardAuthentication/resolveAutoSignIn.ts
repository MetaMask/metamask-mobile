/**
 * Automatic wallet sign-in runs for an explicit Apple Pay or deeplink entry,
 * and for the signed-out Card screen when it is the only screen in the stack.
 * Re-auth after logout or an expired session passes autoSignIn: false.
 */
export function resolveAutoSignIn({
  autoSignIn,
  showAuthPrompt,
  isLoneRoute,
}: {
  autoSignIn?: boolean;
  showAuthPrompt?: boolean;
  isLoneRoute: boolean;
}): boolean {
  if (showAuthPrompt || autoSignIn === false) {
    return false;
  }
  if (autoSignIn === true) {
    return true;
  }
  return isLoneRoute;
}
