import React, { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  MetaMetricsSwapsEventSource,
  TokenFeatureType,
} from '@metamask/bridge-controller';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
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
import AppConstants from '../../../../../core/AppConstants';
import { Box } from '@metamask/design-system-react-native';

export interface TokenWarningModalParams {
  warningType: TokenFeatureType.WARNING | TokenFeatureType.MALICIOUS;
  description: string;
  mode: TokenWarningModalMode;
  location: MetaMetricsSwapsEventSource;
}

export const TokenWarningModal = () => {
  const navigation = useNavigation();
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
    const priceImpact = !activeQuote?.quote.priceData?.priceImpact
      ? 0
      : Number.parseFloat(activeQuote.quote.priceData.priceImpact);

    if (
      Number.isFinite(priceImpact) &&
      priceImpact >=
        (bridgeFeatureFlags?.priceImpactThreshold?.error ??
          AppConstants.BRIDGE.PRICE_IMPACT_ERROR_THRESHOLD)
    ) {
      sheetRef.current?.onCloseBottomSheet();
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.PRICE_IMPACT_MODAL,
        params: {
          type: PriceImpactModalType.Execution,
          token: sourceToken,
        },
      });
      return;
    }

    setLoading(true);
    await confirmBridge();
  }, [activeQuote, bridgeFeatureFlags, confirmBridge, navigation, sourceToken]);

  const isMalicious = warningType === TokenFeatureType.MALICIOUS;
  const title = isMalicious
    ? strings('bridge.token_warning_modal_malicious_title')
    : strings('bridge.token_warning_modal_suspicious_title');

  const footerButtonProps =
    mode === TokenWarningModalMode.Swap
      ? [
          {
            label: strings('bridge.proceed'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            onPress: handleProceed,
            isDisabled: loading,
            loading,
          },
          {
            label: strings('bridge.cancel'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            onPress: handleClose,
            isDisabled: loading,
          },
        ]
      : [
          {
            label: strings('bridge.got_it'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            onPress: handleClose,
          },
        ];

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>{title}</BottomSheetHeader>
      <Box padding={4}>
        <Text variant={TextVariant.BodyMD}>{description}</Text>
      </Box>
      <BottomSheetFooter buttonPropsArray={footerButtonProps} />
    </BottomSheet>
  );
};
