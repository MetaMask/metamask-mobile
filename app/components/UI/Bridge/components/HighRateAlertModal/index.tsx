import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  ButtonIconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { BridgeToken } from '../../types';
import { useSwapBridgeNavigation } from '../../hooks/useSwapBridgeNavigation';
import { HighRateAlertModalSelectorsIDs } from './HighRateAlertModal.testIds';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';

export interface HighRateAlertModalParams {
  sourceToken: BridgeToken;
  destToken?: BridgeToken;
}

export function HighRateAlertModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { goBack } = useNavigation<AppNavigationProp>();
  const { sourceToken, destToken } = useParams<HighRateAlertModalParams>();
  const { goToSwaps } = useSwapBridgeNavigation({
    location: MetaMetricsSwapsEventSource.MainView,
    sourcePage: 'BatchSell',
  });
  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSwapInstead = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      goToSwaps({
        sourceTokenOverride: sourceToken,
        destTokenOverride: destToken,
      });
    });
  }, [destToken, goToSwaps, sourceToken]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={goBack}
      testID={HighRateAlertModalSelectorsIDs.SHEET}
    >
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
