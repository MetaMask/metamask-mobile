import React from 'react';

import { useFooterHostActive } from './footerHostState';
import ContextualFooter from './ContextualFooter';
import ContextualHomeSectionOverlay from './ContextualHomeSectionOverlay';
import { useContextualNavState } from './contextualSection';

/**
 * Footer drawn inside Home while the root host is not active. Tests render
 * this directly. On device the host owns the pill so this stays empty.
 */
const ContextualNativeHomeChrome = () => {
  const hostActive = useFooterHostActive();
  const { section } = useContextualNavState();

  if (hostActive || (section !== 'money' && section !== 'trading')) {
    return null;
  }

  return (
    <>
      <ContextualHomeSectionOverlay />
      <ContextualFooter />
    </>
  );
};

export default ContextualNativeHomeChrome;
