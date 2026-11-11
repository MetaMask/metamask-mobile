import { createContext, useContext } from 'react';

/** Height of the sheet's scrolling area. `0` until a sheet provides one. */
export const SheetScrollViewportContext = createContext(0);

export const useSheetScrollViewport = (): number =>
  useContext(SheetScrollViewportContext);
