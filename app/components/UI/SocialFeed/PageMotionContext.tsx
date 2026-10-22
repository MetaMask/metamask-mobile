import React, { useContext } from 'react';

const PageMotionContext = React.createContext(true);

export const PageMotionProvider = PageMotionContext.Provider;

/**
 * Whether the Social page that rendered this subtree is the one on screen.
 * Every Social v1 page stays mounted, so repeating motion on an off-screen
 * page has to stop on its own. Screens outside Social v1 keep the default.
 */
export const usePageMotion = (): boolean => useContext(PageMotionContext);
