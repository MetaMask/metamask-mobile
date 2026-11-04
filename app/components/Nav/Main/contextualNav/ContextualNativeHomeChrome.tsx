import React, { useLayoutEffect } from 'react';

import ContextualFooter from './ContextualFooter';
import ContextualHomeSectionOverlay from './ContextualHomeSectionOverlay';
import { setInScreenFooterMounted, useActiveHomeTab } from './footerPresence';

/**
 * Pill drawn inside the Home screen, above the tab content. On iOS 26 the
 * system tab bar is a native view the root stack cannot cover reliably, so
 * this overlay — not a sibling of the stack — is what the user sees.
 */
const ContextualNativeHomeChrome = () => {
  const homeRouteName = useActiveHomeTab();

  useLayoutEffect(() => {
    setInScreenFooterMounted(true);
    return () => {
      setInScreenFooterMounted(false);
    };
  }, []);

  return (
    <>
      <ContextualHomeSectionOverlay />
      <ContextualFooter homeRouteName={homeRouteName} rootRouteName="Home" />
    </>
  );
};

export default ContextualNativeHomeChrome;
