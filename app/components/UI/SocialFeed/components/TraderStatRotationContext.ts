import { createContext } from 'react';

/**
 * False while the trader stats under it are off screen, e.g. on a pager page
 * that is not the selected tab. Stats only rotate while it is true.
 */
export const TraderStatRotationContext = createContext(true);
