import { createContext } from 'react';

/**
 * False while the feed under it sits on a pager page that is not the selected
 * tab. Such pages stay mounted and inside the window, so their cards would
 * otherwise keep streaming prices and ticking ages nobody can see.
 */
export const SocialFeedPageActiveContext = createContext(true);
