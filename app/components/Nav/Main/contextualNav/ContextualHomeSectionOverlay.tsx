import React from 'react';
import { type ViewStyle } from 'react-native';
import { Box } from '@metamask/design-system-react-native';

import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import ContextualSectionPlaceholder from './ContextualSectionPlaceholder';
import { useContextualNavState } from './contextualSection';

const OVERLAY_STYLE: ViewStyle = {
  zIndex: 40,
  elevation: 40,
};

const TITLE_BY_TAB = {
  card: 'Card',
  earn: 'Earn',
} as const;

/**
 * Covers the Money screen while Card or Earn is selected.
 * Account keeps the real Money screen underneath.
 */
const ContextualHomeSectionOverlay = () => {
  const { section, tab } = useContextualNavState();
  const tabBarInset = useFloatingTabBarInset();

  const title =
    section === 'money' && (tab === 'card' || tab === 'earn')
      ? TITLE_BY_TAB[tab]
      : null;

  if (title === null) {
    return null;
  }

  return (
    <Box
      twClassName="absolute left-0 right-0 top-0"
      style={[OVERLAY_STYLE, { bottom: tabBarInset }]}
      accessibilityViewIsModal
      testID="contextual-home-section-overlay"
    >
      <ContextualSectionPlaceholder title={title} />
    </Box>
  );
};

export default ContextualHomeSectionOverlay;
