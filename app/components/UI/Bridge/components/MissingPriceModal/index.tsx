import React, { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';
import {
  BottomSheet,
  BottomSheetRef,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  ButtonIconSize,
  ButtonsAlignment,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

export interface MissingPriceModalParams {
  location: MetaMetricsSwapsEventSource;
}

export const MissingPriceModal = () => {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [loading, setLoading] = useState(false);
  const { location } = useParams<MissingPriceModalParams>();

  const sourceToken = useSelector(selectSourceToken);
  const tokenBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
  });

  const confirmBridge = useBridgeConfirm({
    latestSourceBalance: tokenBalance,
    location,
  });

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleProceed = useCallback(async () => {
    setLoading(true);
    await confirmBridge();
  }, [confirmBridge]);

  return (
    <BottomSheet ref={sheetRef} goBack={navigation.goBack}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: 'header-close-button',
        }}
      >
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.ErrorDefault}
        />
      </BottomSheetHeader>
      <Box
        alignItems={BoxAlignItems.Center}
        paddingBottom={4}
        paddingHorizontal={4}
        gap={2}
      >
        <Text variant={TextVariant.BodyLg} twClassName="text-center">
          {strings('swaps.market_price_unavailable_title')}
        </Text>
        <Text variant={TextVariant.BodyMd} twClassName="text-center">
          {strings('swaps.market_price_unavailable')}
        </Text>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        secondaryButtonProps={{
          children: strings('bridge.proceed'),
          onPress: handleProceed,
          isDisabled: loading,
          isLoading: loading,
          testID: 'footer-secondary-button',
        }}
        primaryButtonProps={{
          children: strings('bridge.cancel'),
          onPress: handleClose,
          isDisabled: loading,
          testID: 'footer-primary-button',
        }}
      />
    </BottomSheet>
  );
};
