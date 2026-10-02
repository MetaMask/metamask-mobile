/**
 * Backend-mediated X OAuth redirect target. The Profile API's X OAuth flow
 * redirects the authorization browser session back to this universal link
 * with `code`/`state` (or `error`) query params; the app intercepts the
 * redirect and relays the code to the backend via ProfileController.
 *
 * Kept as a standalone constant so the OAuth registration and the app-side
 * redirect matching stay in one place.
 */
export const X_REDIRECT_URI = 'https://link.metamask.io/x-oauth-redirect';
