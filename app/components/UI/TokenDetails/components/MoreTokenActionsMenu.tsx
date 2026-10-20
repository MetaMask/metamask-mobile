import React, { useCallback, useRef } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { Box } from '@metamask/design-system-react-native';
import ActionListItem from '../../../../component-library/components-temp/ActionListItem';
import { TokenI } from '../../Tokens/types';
import { TokenDetailsAction } from '../constants/constants';
import { useMoreTokenActions } from '../hooks/useMoreTokenActions';

export interface MoreTokenActionsMenuParams {
  hasPerpsMarket: boolean;
  hasBalance: boolean;
  isBuyable: boolean;
  isNativeCurrency: boolean;
  asset: TokenI;
  onBuy: () => void;
  onReceive?: () => void;
  onActionTapped?: (action: TokenDetailsAction) => void;
}

type MoreTokenActionsMenuRouteProp = RouteProp<
  { MoreTokenActionsMenu: MoreTokenActionsMenuParams },
  'MoreTokenActionsMenu'
>;

const MoreTokenActionsMenu = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute<MoreTokenActionsMenuRouteProp>();

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const actionConfigs = useMoreTokenActions({
    ...route.params,
    closeAndRun: closeBottomSheetAndNavigate,
  });

  return (
    <BottomSheet ref={sheetRef}>
      <Box twClassName="py-4">
        {actionConfigs.map((config) => (
          <ActionListItem
            key={config.type}
            label={config.label}
            description={config.description}
            iconName={config.iconName}
            onPress={config.onPress}
            testID={config.testID}
            isDisabled={config.isDisabled}
          />
        ))}
      </Box>
    </BottomSheet>
  );
};

MoreTokenActionsMenu.displayName = 'MoreTokenActionsMenu';

export default MoreTokenActionsMenu;
