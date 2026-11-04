import React, { useEffect, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Box, IconName, Text } from '@metamask/design-system-react-native';

import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { useIsGlassSurfaceEnabled } from '../../hooks/useIsGlassSurfaceEnabled';
import { selectMoneyBrandRefreshEnabled } from '../../../selectors/featureFlagController/moneyBrandRefresh';
import Routes from '../../../constants/navigation/Routes';
import ContextualFooter from '../../Nav/Main/contextualNav/ContextualFooter';
import {
  exitContextualSection,
  getContextualNavState,
} from '../../Nav/Main/contextualNav/contextualSection';

const PAGE_STYLE: ViewStyle = { flex: 1 };

const TITLE = 'Collectibles';

export interface CollectiblesViewProps {
  /**
   * Drawn inside the Trade tab.
   */
  embedded?: boolean;
}

/**
 * Collectibles page with a centered title matching other standard page headers.
 */
export const CollectiblesView = ({
  embedded = false,
}: CollectiblesViewProps) => {
  const isGlass = useIsGlassSurfaceEnabled(selectMoneyBrandRefreshEnabled);

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandardGlass
        isGlass={isGlass}
        isFloating={false}
        includesTopInset
        title={TITLE}
        endButtonIconProps={[
          {
            iconName: IconName.MoreVertical,
            onPress: () => undefined,
            accessibilityLabel: 'Menu',
            twClassName: 'bg-transparent',
          },
        ]}
      />
      <Box twClassName="flex-1 items-center justify-center">
        <Text>Placeholder</Text>
      </Box>
    </Box>
  );
};

/**
 * Collectibles opened from Trade. The pill is drawn in this screen so it
 * stays above the pushed page.
 */
const CollectiblesSectionScreen = () => {
  const [isSection] = useState(
    () => getContextualNavState().section === 'collectibles',
  );

  useEffect(() => {
    if (!isSection) {
      return undefined;
    }
    return () => {
      exitContextualSection();
    };
  }, [isSection]);

  return (
    <View style={PAGE_STYLE}>
      <CollectiblesView />
      {isSection ? (
        <ContextualFooter rootRouteName={Routes.COLLECTIBLES_VIEW} />
      ) : null}
    </View>
  );
};

export default CollectiblesSectionScreen;
