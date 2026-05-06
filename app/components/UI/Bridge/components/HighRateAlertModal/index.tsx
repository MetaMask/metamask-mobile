import React, { useCallback, useRef } from 'react';
import {
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonIconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { BridgeToken } from '../../types';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../hooks/useSwapBridgeNavigation';
import { HighRateAlertModalSelectorsIDs } from './HighRateAlertModal.testIds';

export interface HighRateAlertModalParams {
  sourceToken: BridgeToken;
  destToken?: BridgeToken;
}

export function HighRateAlertModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { sourceToken, destToken } = useParams<HighRateAlertModalParams>();
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.MainView,
    sourcePage: 'BatchSell',
  });

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSwapInstead = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      goToSwaps(sourceToken, destToken);
    });
  }, [destToken, goToSwaps, sourceToken]);

  return (
    <BottomSheet ref={sheetRef} testID={HighRateAlertModalSelectorsIDs.SHEET}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: HighRateAlertModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.batch_sell_single_token_dialog_title')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4} paddingTop={2} paddingBottom={4}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          {strings('bridge.batch_sell_single_token_dialog_description')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.batch_sell_swap_instead'),
          onPress: handleSwapInstead,
          testID: HighRateAlertModalSelectorsIDs.SWAP_INSTEAD_BUTTON,
        }}
      />
    </BottomSheet>
  );
}
