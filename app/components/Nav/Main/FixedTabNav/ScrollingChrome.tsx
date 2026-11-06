import { createContext, useContext, type ReactNode } from 'react';

/**
 * Header chrome that belongs at the top of a nested scroller.
 * The screen that owns the header provides it; the list or scroll view
 * renders `ScrollingChrome` as its first child so the header moves with
 * the content.
 */
const ScrollingChromeContext = createContext<ReactNode>(null);

export const ScrollingChromeProvider = ScrollingChromeContext.Provider;

export const useScrollingChrome = () => useContext(ScrollingChromeContext);

export const ScrollingChrome = () => useScrollingChrome();
