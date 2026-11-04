import React, { useCallback, useEffect, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import {
  Box,
  ButtonIcon,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import HeaderRootGlass from '../../../component-library/components-temp/HeaderRootGlass';
import { useNativeHeader } from '../../hooks/useNativeHeader';
import { useIsGlassSurfaceEnabled } from '../../hooks/useIsGlassSurfaceEnabled';
import { selectMoneyBrandRefreshEnabled } from '../../../selectors/featureFlagController/moneyBrandRefresh';
import {
  exitContextualSection,
  getContextualNavState,
} from '../../Nav/Main/contextualNav/contextualSection';

const PAGE_STYLE: ViewStyle = { flex: 1 };

const TITLE = 'Collectibles';

/**
 * Collectibles page. The header matches Money: a native bar when that header
 * is native, otherwise the same glass root header, titled Collectibles.
 */
const CollectiblesView = () => {
  const isBrandRefresh = useSelector(selectMoneyBrandRefreshEnabled) === true;
  const isGlass = useIsGlassSurfaceEnabled(selectMoneyBrandRefreshEnabled);

  const leftItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'custom',
        hidesSharedBackground: true,
        element: <Text variant={TextVariant.HeadingLg}>{TITLE}</Text>,
      },
    ],
    [],
  );

  const rightItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'custom',
        element: (
          <Box twClassName="px-1">
            <ButtonIcon
              iconName={IconName.MoreVertical}
              onPress={() => undefined}
              accessibilityLabel="Menu"
              twClassName="bg-transparent"
            />
          </Box>
        ),
      },
    ],
    [],
  );

  const isNativeHeader = useNativeHeader({
    leftItems,
    rightItems,
    isEnabled: isBrandRefresh,
    hidesScrollEdgeEffect: true,
  });

  return (
    <Box twClassName="flex-1 bg-default">
      {isNativeHeader ? null : (
        <HeaderRootGlass
          isGlass={isGlass}
          includesTopInset={isGlass}
          twClassName="pl-4 pr-3"
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
      )}
      <Box twClassName="flex-1 items-center justify-center">
        <Text>Placeholder</Text>
      </Box>
    </Box>
  );
};

/**
 * Collectibles opened from Trade. The shared footer host draws Popular,
 * Packs, Collection, and Market over this screen.
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
    </View>
  );
};

export default CollectiblesSectionScreen;
