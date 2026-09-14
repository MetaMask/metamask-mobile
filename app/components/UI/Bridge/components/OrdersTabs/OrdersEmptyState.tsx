import React from 'react';
import { Image } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  TabEmptyState,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAssetFromTheme } from '../../../../../util/theme';
import emptyStatePerpsLight from '../../../../../images/empty-state-perps-light.png';
import emptyStatePerpsDark from '../../../../../images/empty-state-perps-dark.png';
import { OrdersTabsSelectorsIDs } from './OrdersTabs.testIds';

interface OrdersEmptyStateProps {
  description: string;
}

export function OrdersEmptyState({ description }: OrdersEmptyStateProps) {
  const tw = useTailwind();
  const emptyStateIcon = useAssetFromTheme(
    emptyStatePerpsLight,
    emptyStatePerpsDark,
  );

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="grow"
    >
      <TabEmptyState
        testID={OrdersTabsSelectorsIDs.EMPTY_STATE}
        icon={
          <Image
            source={emptyStateIcon}
            resizeMode="contain"
            style={tw.style('h-[72px] w-[72px]')}
            accessible={false}
          />
        }
        description={description}
      />
    </Box>
  );
}
