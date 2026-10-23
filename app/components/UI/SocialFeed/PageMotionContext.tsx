import React, { useContext } from 'react';

const PageMotionContext = React.createContext(true);

export const PageMotionProvider = PageMotionContext.Provider;

/** True when this Social page is on screen. Off-screen pages stay mounted and stop their own motion. */
export const usePageMotion = (): boolean => useContext(PageMotionContext);
