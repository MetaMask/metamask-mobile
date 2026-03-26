import React, { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  MetaMetricsSwapsEventSource,
  TokenFeatureType,
} from '@metamask/bridge-controller';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { TokenWarningModalMode } from './constants';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import {
  selectSourceToken,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import { PriceImpactModalType } from '../PriceImpactModal/constants';
import Routes from '../../../../../constants/navigation/Routes';
import {
  exceedsPriceImpactErrorThreshold,
  parsePriceImpact,
} from '../../utils/getPriceImpactViewData';
import {
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

export interface TokenWarningModalParams {
  warningType: TokenFeatureType.WARNING | TokenFeatureType.MALICIOUS;
  // descriptions are not translated — they come from the backend directly in English.
  // Until Blockaid provides a full list of error codes, these will remain in English for now.
  description: string;
  mode: TokenWarningModalMode;
  location: MetaMetricsSwapsEventSource;
}

export const TokenWarningModal = () => {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [loading, setLoading] = useState(false);

  const { warningType, description, mode, location } =
    useParams<TokenWarningModalParams>();

  const sourceToken = useSelector(selectSourceToken);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const { activeQuote } = useBridgeQuoteData();

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
    const priceImpact = parsePriceImpact(
      activeQuote?.quote.priceData?.priceImpact,
    );

    if (
      exceedsPriceImpactErrorThreshold(
        priceImpact,
        bridgeFeatureFlags?.priceImpactThreshold?.error,
      )
    ) {
      navigation.replace(Routes.BRIDGE.MODALS.PRICE_IMPACT_MODAL, {
        type: PriceImpactModalType.Execution,
        token: sourceToken,
        location,
      });
      return;
    }

    setLoading(true);
    await confirmBridge();
  }, [
    activeQuote,
    bridgeFeatureFlags,
    confirmBridge,
    navigation,
    sourceToken,
    location,
  ]);

  const isMalicious = warningType === TokenFeatureType.MALICIOUS;
  const iconName = isMalicious ? IconName.Danger : IconName.Warning;
  const iconColor = isMalicious
    ? IconColor.ErrorDefault
    : IconColor.WarningDefault;
  const title = isMalicious
    ? strings('bridge.token_warning_modal_malicious_title')
    : strings('bridge.token_warning_modal_suspicious_title');

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: 'header-close-button',
        }}
      >
        <Icon name={iconName} size={IconSize.Xl} color={iconColor} />
      </BottomSheetHeader>
      <Box
        alignItems={BoxAlignItems.Center}
        paddingBottom={4}
        paddingHorizontal={4}
        gap={2}
      >
        <Text variant={TextVariant.BodyLg} twClassName="text-center">
          {title}
        </Text>
        <Text variant={TextVariant.BodyMd} twClassName="text-center">
          {description}
        </Text>
      </Box>
      {mode === TokenWarningModalMode.Execution ? (
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
      ) : (
        <BottomSheetFooter
          primaryButtonProps={{
            children: strings('bridge.got_it'),
            onPress: handleClose,
            testID: 'footer-primary-button',
          }}
        />
      )}
    </BottomSheet>
  );
};
