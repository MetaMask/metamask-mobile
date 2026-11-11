import React, { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
// Must use this to make sure scroll works inside a bottom sheet on Android
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { TokenWarningModalMode } from './constants';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { selectDestToken } from '../../../../../core/redux/slices/bridge';
import { PriceImpactModalType } from '../PriceImpactModal/constants';
import Routes from '../../../../../constants/navigation/Routes';
import { hasMissingPriceData } from '../../utils/hasMissingPriceData';
import { getNegativeFeatureLabels } from '../../../SecurityTrust/utils/securityUtils';
import { getBridgeTokenSecurityConfig } from '../../utils/tokenSecurityUtils';
import { SecurityDataType, SecurityFeature } from '../../types';
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
  warningType:
    | SecurityDataType.Warning
    | SecurityDataType.Malicious
    | SecurityDataType.Spam;
  features: SecurityFeature[];
  mode: TokenWarningModalMode;
  location: MetaMetricsSwapsEventSource;
}

export const getTokenWarningContent = (
  warningType:
    | SecurityDataType.Warning
    | SecurityDataType.Malicious
    | SecurityDataType.Spam,
  destTokenSymbol: string,
) => {
  const isMalicious = warningType === SecurityDataType.Malicious;
  const securityConfig = getBridgeTokenSecurityConfig(warningType);
  return {
    isMalicious,
    headlineIconName: securityConfig.iconName,
    headlineIconColor: securityConfig.iconColor,
    featureIconName: securityConfig.iconName,
    featureIconColor: securityConfig.iconColor,
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

type BridgeQuoteData = ReturnType<typeof useBridgeQuoteDataContext>;

interface TokenWarningModalSheetProps {
  activeQuote?: BridgeQuoteData['activeQuote'];
  shouldShowPriceImpactError?: BridgeQuoteData['shouldShowPriceImpactError'];
  confirmBridge?: ReturnType<typeof useBridgeConfirm>;
}

const TokenWarningModalSheet = ({
  activeQuote,
  shouldShowPriceImpactError,
  confirmBridge,
}: TokenWarningModalSheetProps) => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [loading, setLoading] = useState(false);

  const {
    warningType,
    features = [],
    mode,
    location,
  } = useParams<TokenWarningModalParams>();

  const destToken = useSelector(selectDestToken);

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

    if (shouldShowPriceImpactError) {
      navigation.replace(Routes.BRIDGE.MODALS.PRICE_IMPACT_MODAL, {
        type: PriceImpactModalType.Execution,
        location,
      });
      return;
    }

    setLoading(true);
    if (sheetRef.current?.onCloseBottomSheet) {
      sheetRef.current.onCloseBottomSheet(confirmBridge);
    } else {
      await confirmBridge?.();
    }
  }, [
    activeQuote,
    confirmBridge,
    navigation,
    location,
    shouldShowPriceImpactError,
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

  const negativeFeatureLabels = getNegativeFeatureLabels();
  // Same rule as Token Details: only list features matching this severity.
  const severityTypes: string[] = isMalicious
    ? [SecurityDataType.Malicious]
    : [SecurityDataType.Warning, SecurityDataType.Spam];
  const shownFeatures = features.filter((feature) =>
    severityTypes.includes(
      negativeFeatureLabels[feature.featureId]?.type ?? feature.type,
    ),
  );

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
          <Box alignItems={BoxAlignItems.Center} twClassName="w-full">
            <Icon
              name={headlineIconName}
              size={IconSize.Xl}
              color={headlineIconColor}
            />
            <Text
              variant={TextVariant.HeadingMd}
              twClassName="text-center mt-4"
            >
              {title}
            </Text>
            {isMalicious ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                backgroundColor={BoxBackgroundColor.ErrorMuted}
                gap={3}
                twClassName="mt-5 w-full rounded-2xl pl-[25px] pr-4 py-3"
              >
                <Icon
                  name={IconName.Error}
                  size={IconSize.Md}
                  color={IconColor.ErrorDefault}
                  twClassName="mt-1"
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
                twClassName="text-center mt-2"
              >
                {description}
              </Text>
            )}
          </Box>
          {shownFeatures.length > 0 ? (
            <Box twClassName="w-full">
              {shownFeatures.map((feature) => (
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
                      {negativeFeatureLabels[feature.featureId]?.label ??
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

// Quote data and confirm only exist inside the Bridge providers, so they are
// read only in Execution mode. Info mode can open from outside them (e.g.
// Quick Buy).
const TokenWarningExecutionModal = () => {
  const { location } = useParams<TokenWarningModalParams>();
  const { activeQuote, shouldShowPriceImpactError } =
    useBridgeQuoteDataContext();
  const confirmBridge = useBridgeConfirm({ activeQuote, location });

  return (
    <TokenWarningModalSheet
      activeQuote={activeQuote}
      shouldShowPriceImpactError={shouldShowPriceImpactError}
      confirmBridge={confirmBridge}
    />
  );
};

export const TokenWarningModal = () => {
  const { mode } = useParams<TokenWarningModalParams>();
  return mode === TokenWarningModalMode.Execution ? (
    <TokenWarningExecutionModal />
  ) : (
    <TokenWarningModalSheet />
  );
};
