import React, { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
// Must use this to make sure scroll works inside a bottom sheet on Android
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
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
  selectDestToken,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import { PriceImpactModalType } from '../PriceImpactModal/constants';
import Routes from '../../../../../constants/navigation/Routes';
import {
  exceedsPriceImpactErrorThreshold,
  parsePriceImpact,
} from '../../utils/getPriceImpactViewData';
import { hasMissingPriceData } from '../../utils/hasMissingPriceData';
import { NEGATIVE_FEATURE_LABELS } from '../../../SecurityTrust/utils/securityUtils';
import {
  SecurityDataType,
  SecurityFeature,
} from '../../hooks/usePopularTokens';
import {
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  Button,
  ButtonIconSize,
  ButtonsAlignment,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export interface TokenWarningModalParams {
  warningType: SecurityDataType.Warning | SecurityDataType.Malicious;
  features: SecurityFeature[];
  mode: TokenWarningModalMode;
  location: MetaMetricsSwapsEventSource;
}

export const getTokenWarningContent = (
  warningType: SecurityDataType.Warning | SecurityDataType.Malicious,
  destTokenSymbol: string,
) => {
  const isMalicious = warningType === SecurityDataType.Malicious;
  return {
    isMalicious,
    headlineIconName: isMalicious ? IconName.Error : IconName.Danger,
    headlineIconColor: isMalicious
      ? IconColor.ErrorDefault
      : IconColor.WarningDefault,
    featureIconName: isMalicious ? IconName.Error : IconName.Danger,
    featureIconColor: isMalicious
      ? IconColor.ErrorDefault
      : IconColor.WarningDefault,
    title: isMalicious
      ? strings('bridge.token_warning_modal_malicious_title')
      : strings('bridge.token_warning_modal_suspicious_title'),
    description: isMalicious
      ? strings('bridge.token_warning_modal_malicious_description', {
          symbol: destTokenSymbol,
        })
      : strings('bridge.token_warning_modal_suspicious_description', {
          symbol: destTokenSymbol,
        }),
    fallbackFeatureRowTitle: isMalicious
      ? strings('bridge.token_warning_modal_malicious_feature_title')
      : strings('bridge.token_warning_modal_suspicious_feature_title'),
  };
};

export const TokenWarningModal = () => {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [loading, setLoading] = useState(false);

  const { warningType, features, mode, location } =
    useParams<TokenWarningModalParams>();

  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
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
    if (hasMissingPriceData(activeQuote)) {
      navigation.replace(Routes.BRIDGE.MODALS.MISSING_PRICE_MODAL, {
        location,
      });
      return;
    }

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

  const {
    isMalicious,
    headlineIconName,
    headlineIconColor,
    featureIconName,
    featureIconColor,
    title,
    description,
    fallbackFeatureRowTitle,
  } = getTokenWarningContent(warningType, destToken?.symbol ?? '');

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: 'header-close-button',
        }}
      />
      <ScrollView testID="token-warning-modal-scroll">
        <Box
          alignItems={BoxAlignItems.Center}
          paddingHorizontal={4}
          paddingBottom={4}
          gap={4}
        >
          <Box alignItems={BoxAlignItems.Center} gap={2} twClassName="w-full">
            <Icon
              name={headlineIconName}
              size={IconSize.Xl}
              color={headlineIconColor}
            />
            <Text variant={TextVariant.HeadingMd} twClassName="text-center">
              {title}
            </Text>
            {isMalicious ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                backgroundColor={BoxBackgroundColor.ErrorMuted}
                gap={3}
                twClassName="w-full rounded-2xl pl-6 pr-4 py-3"
              >
                <Icon
                  name={IconName.Error}
                  size={IconSize.Md}
                  color={IconColor.ErrorDefault}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.ErrorDefault}
                  twClassName="flex-1"
                >
                  {description}
                </Text>
              </Box>
            ) : (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {description}
              </Text>
            )}
          </Box>
          {features.length > 0 ? (
            <Box twClassName="w-full">
              {features.map((feature) => (
                <Box
                  key={feature.featureId}
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={3}
                  paddingVertical={2}
                  twClassName="w-full"
                >
                  <Icon
                    name={featureIconName}
                    size={IconSize.Md}
                    color={featureIconColor}
                  />
                  <Box twClassName="flex-1">
                    <Text variant={TextVariant.BodyMd}>
                      {NEGATIVE_FEATURE_LABELS[feature.featureId]?.label ??
                        fallbackFeatureRowTitle}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {feature.description}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
      </ScrollView>
      {mode === TokenWarningModalMode.Execution ? (
        isMalicious ? (
          <Box gap={4} twClassName="px-2 py-1">
            <Button
              isDanger
              isFullWidth
              onPress={handleProceed}
              isDisabled={loading}
              isLoading={loading}
              testID="footer-secondary-button"
            >
              {strings('bridge.token_warning_modal_continue_anyway')}
            </Button>
            <Button
              isFullWidth
              onPress={handleClose}
              isDisabled={loading}
              testID="footer-primary-button"
            >
              {strings('bridge.cancel')}
            </Button>
          </Box>
        ) : (
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
        )
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
