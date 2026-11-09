import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { strings } from '../../../../../../locales/i18n';
import { selectCardActiveProviderId } from '../../../../../selectors/cardController';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import type { WalletType } from '../../pushProvisioning/types';
import { getWalletTypeForPlatform } from '../../pushProvisioning/constants';
import { CardScreens, withCardProvider } from '../../util/metrics';
import { useCardCapabilities } from '../../hooks/useCardCapabilities';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { useRevealCardDetails } from '../../hooks/useRevealCardDetails';
import CardSecureDetailsView from '../CardSecureDetailsView';
import { CardScreenshotDeterrent } from '../CardScreenshotDeterrent';
import { DigitalWalletInstructionsSheetSelectors } from './DigitalWalletInstructionsSheet.testIds';

const STEP_KEYS: Record<WalletType, readonly string[]> = {
  apple_wallet: [
    'card.digital_wallet_instructions.steps.apple.open_wallet',
    'card.digital_wallet_instructions.steps.apple.choose_card',
    'card.digital_wallet_instructions.steps.apple.enter_details',
  ],
  google_wallet: [
    'card.digital_wallet_instructions.steps.google.open_wallet',
    'card.digital_wallet_instructions.steps.google.choose_card',
    'card.digital_wallet_instructions.steps.google.enter_details',
  ],
};

const WALLET_HEADING_KEY: Record<WalletType, string> = {
  apple_wallet: 'card.digital_wallet_instructions.apple_wallet',
  google_wallet: 'card.digital_wallet_instructions.google_wallet',
};

const DigitalWalletInstructionsSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const hasTrackedView = useRef(false);
  const [isRevealPending, setIsRevealPending] = useState(true);
  const navigation = useNavigation<AppNavigationProp>();
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const capabilities = useCardCapabilities();
  const { data } = useCardHomeData();
  const walletType = useMemo(() => getWalletTypeForPlatform(), []);

  const {
    isCardDetailsLoading,
    isCardDetailsImageLoading,
    onCardDetailsImageLoad,
    cardDetailsImageUrl,
    onCardDetailsImageError,
    cardSensitiveDetails,
    isSensitiveDetailsLoading,
    isDetailsVisible,
    clearCardDetails,
    copyCardDetail,
    revealCardDetails,
  } = useRevealCardDetails({
    cardType: data?.card?.type,
    capabilities,
  });

  const steps = useMemo(
    () => STEP_KEYS[walletType].map((key) => strings(key)),
    [walletType],
  );

  const runReveal = useCallback(async () => {
    setIsRevealPending(true);
    try {
      await revealCardDetails();
    } finally {
      setIsRevealPending(false);
    }
  }, [revealCardDetails]);

  const hasAutoRevealed = useRef(false);

  useEffect(() => {
    if (hasTrackedView.current) {
      return;
    }
    hasTrackedView.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(activeProviderId, {
            screen: CardScreens.DIGITAL_WALLET_INSTRUCTIONS_SHEET,
            wallet_type: walletType,
          }),
        )
        .build(),
    );
  }, [activeProviderId, createEventBuilder, trackEvent, walletType]);

  useEffect(() => {
    if (hasAutoRevealed.current) {
      return;
    }
    hasAutoRevealed.current = true;
    runReveal().catch(() => undefined);
  }, [runReveal]);

  const handleClose = useCallback(() => {
    clearCardDetails();
    sheetRef.current?.onCloseBottomSheet();
  }, [clearCardDetails]);

  const handleGoBack = useCallback(() => {
    clearCardDetails();
    navigation.goBack();
  }, [clearCardDetails, navigation]);

  const handleRetryReveal = useCallback(() => {
    runReveal().catch(() => undefined);
  }, [runReveal]);

  const showDetailsSkeleton =
    isSensitiveDetailsLoading ||
    isCardDetailsLoading ||
    (Boolean(cardDetailsImageUrl) && isCardDetailsImageLoading);
  const showRetry = !isDetailsVisible && !showDetailsSkeleton;

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      keyboardAvoidingViewEnabled={false}
      testID={DigitalWalletInstructionsSheetSelectors.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: DigitalWalletInstructionsSheetSelectors.CLOSE_BUTTON,
        }}
      >
        <Text
          variant={TextVariant.HeadingSm}
          testID={DigitalWalletInstructionsSheetSelectors.TITLE}
        >
          {strings('card.digital_wallet_instructions.title')}
        </Text>
      </BottomSheetHeader>

      <ScrollView>
        <Box paddingBottom={6} paddingHorizontal={4} gap={4}>
          {!isDetailsVisible && !showDetailsSkeleton && (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              twClassName="text-alternative"
              testID={DigitalWalletInstructionsSheetSelectors.DESCRIPTION}
            >
              {strings('card.digital_wallet_instructions.description')}
            </Text>
          )}

          <Box testID={DigitalWalletInstructionsSheetSelectors.CARD_DETAILS}>
            {(isDetailsVisible || showDetailsSkeleton) && (
              <CardSecureDetailsView
                isLoading={showDetailsSkeleton && !isDetailsVisible}
                cardDetailsImageUrl={cardDetailsImageUrl}
                isCardDetailsImageLoading={isCardDetailsImageLoading}
                onImageLoad={onCardDetailsImageLoad}
                onImageError={onCardDetailsImageError}
                cardSensitiveDetails={cardSensitiveDetails}
                onCopyDetail={copyCardDetail}
              />
            )}

            {showRetry && (
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                isFullWidth
                isDisabled={isRevealPending}
                onPress={handleRetryReveal}
                testID={
                  DigitalWalletInstructionsSheetSelectors.VIEW_CARD_DETAILS_BUTTON
                }
              >
                {strings(
                  'card.card_home.manage_card_options.view_card_details',
                )}
              </Button>
            )}
          </Box>

          <Text
            variant={TextVariant.HeadingSm}
            testID={DigitalWalletInstructionsSheetSelectors.WALLET_HEADING}
          >
            {strings(WALLET_HEADING_KEY[walletType])}
          </Text>

          <Box gap={4} testID={DigitalWalletInstructionsSheetSelectors.STEPS}>
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              return (
                <Box
                  key={`${walletType}-${stepNumber}`}
                  twClassName="flex-row items-start gap-3"
                  testID={DigitalWalletInstructionsSheetSelectors.step(
                    stepNumber,
                  )}
                >
                  <Box twClassName="w-6 h-6 rounded-full bg-icon-default items-center justify-center">
                    <Text
                      variant={TextVariant.BodySm}
                      fontWeight={FontWeight.Medium}
                      twClassName="text-background-default"
                    >
                      {stepNumber}
                    </Text>
                  </Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    twClassName="flex-1"
                  >
                    {step}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>
      </ScrollView>

      <CardScreenshotDeterrent enabled={isDetailsVisible} />
    </BottomSheet>
  );
};

export default DigitalWalletInstructionsSheet;
