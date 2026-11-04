import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Box } from '@metamask/design-system-react-native';

import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import { CardEmbeddedProvider } from '../../../UI/Card/CardEmbeddedContext';
import CardHome from '../../../UI/Card/Views/CardHome/CardHome';
import { CardSDKProvider } from '../../../UI/Card/sdk';
import { EarnEmbeddedProvider } from '../../../UI/Earn/EarnEmbeddedContext';
import EarnSectionListView from '../../../UI/Earn/Views/EarnSectionListView/EarnSectionListView';
import { useContextualNavState } from './contextualSection';

const OVERLAY_STYLE: ViewStyle = {
  zIndex: 40,
  elevation: 40,
};

const FILL_STYLE: ViewStyle = { flex: 1 };

/**
 * Covers the Money screen while Card or Earn is selected.
 * Card is the card home itself, not the card navigator. A nested native
 * stack would change the Money tab's header, which native tabs reject.
 */
const ContextualHomeSectionOverlay = () => {
  const { section, tab } = useContextualNavState();
  const tabBarInset = useFloatingTabBarInset();

  if (section !== 'money' || (tab !== 'card' && tab !== 'earn')) {
    return null;
  }

  return (
    <Box
      twClassName="absolute left-0 right-0 top-0"
      style={[OVERLAY_STYLE, { bottom: tabBarInset }]}
      accessibilityViewIsModal
      testID="contextual-home-section-overlay"
    >
      {tab === 'card' ? (
        <View style={FILL_STYLE} testID="contextual-card-screen">
          <CardEmbeddedProvider value>
            <CardSDKProvider>
              <CardHome />
            </CardSDKProvider>
          </CardEmbeddedProvider>
        </View>
      ) : (
        <View style={FILL_STYLE} testID="contextual-earn-screen">
          <EarnEmbeddedProvider value>
            <EarnSectionListView />
          </EarnEmbeddedProvider>
        </View>
      )}
    </Box>
  );
};

export default ContextualHomeSectionOverlay;
