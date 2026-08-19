import { v4 } from 'uuid';

/**
 * A unique identifier for the current app session, scoped to homepage analytics.
 *
 * Generated once when this module is first imported (i.e. on app launch) and
 * never persisted to storage. Every app restart produces a new ID.
 *
 * Use this to group all HOME_VIEWED events that occurred within the same app
 * launch, distinguishing a user who navigated away and returned (same session,
 * same ID) from a user who killed and reopened the app (new session, new ID).
 */
export const HOMEPAGE_APP_SESSION_ID: string = v4();
