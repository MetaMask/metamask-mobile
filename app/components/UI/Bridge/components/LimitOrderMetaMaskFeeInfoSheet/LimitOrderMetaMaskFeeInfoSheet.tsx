import React, { useCallback, useRef } from 'react';
import { Linking } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  BoxAlignItems,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import {
  LIMIT_ORDER_DEFAULT_METAMASK_FEE,
  LIMIT_ORDER_METAMASK_FEE_LEARN_MORE_URL,
} from '../../constants/limitOrders';
import { LimitOrderMetaMaskFeeInfoSheetSelectorsIDs } from './LimitOrderMetaMaskFeeInfoSheet.testIds';
import type { LimitOrderMetaMaskFeeInfoSheetProps } from './LimitOrderMetaMaskFeeInfoSheet.types';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

const LimitOrderMetaMaskFeeInfoSheet = ({
  goBack,
}: LimitOrderMetaMaskFeeInfoSheetProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleLearnMorePress = useCallback(async () => {
    try {
      await Linking.openURL(LIMIT_ORDER_METAMASK_FEE_LEARN_MORE_URL);
    } catch (error) {
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        message: 'Failed to open limit order MetaMask fee learn more URL',
      });
    }
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.SHEET}
      goBack={goBack}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={closeSheet}
        closeButtonProps={{
          testID: LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.limit.metamask_fee_info_title')}
      </BottomSheetHeaderGlass>
      <Box
        alignItems={BoxAlignItems.Center}
        gap={3}
        paddingHorizontal={4}
        paddingBottom={4}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.BODY}
        >
          {strings('bridge.limit.metamask_fee_info_body', {
            feePercentage: LIMIT_ORDER_DEFAULT_METAMASK_FEE,
          })}
        </Text>
        <TextButton
          onPress={handleLearnMorePress}
          testID={LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.LEARN_MORE}
        >
          {strings('bridge.limit.metamask_fee_info_learn_more')}
        </TextButton>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.got_it'),
          onPress: closeSheet,
          testID: LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.GOT_IT_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default LimitOrderMetaMaskFeeInfoSheet;
