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
  actionButtonText?: string;
  onAction?: () => void;
  testID?: string;
  actionButtonTestID?: string;
}

export function OrdersEmptyState({
  description,
  actionButtonText,
  onAction,
  testID = OrdersTabsSelectorsIDs.EMPTY_STATE,
  actionButtonTestID,
}: OrdersEmptyStateProps) {
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
        testID={testID}
        icon={
          <Image
            source={emptyStateIcon}
            resizeMode="contain"
            style={tw.style('h-[72px] w-[72px]')}
            accessible={false}
          />
        }
        description={description}
        actionButtonText={actionButtonText}
        onAction={onAction}
        actionButtonProps={
          actionButtonTestID ? { testID: actionButtonTestID } : undefined
        }
      />
    </Box>
  );
}
