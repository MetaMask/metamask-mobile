import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  FontWeight,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  TabsBar,
  type TabItem,
} from '../../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import type { WalletType } from '../../pushProvisioning/types';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { DigitalWalletInstructionsSheetSelectors } from './DigitalWalletInstructionsSheet.testIds';

const APPLE_WALLET_INDEX = 0;
const GOOGLE_WALLET_INDEX = 1;

const STEP_KEYS: Record<WalletType, readonly string[]> = {
  apple_wallet: [
    'card.digital_wallet_instructions.steps.reveal_card_details',
    'card.digital_wallet_instructions.steps.apple.open_wallet',
    'card.digital_wallet_instructions.steps.apple.choose_card',
    'card.digital_wallet_instructions.steps.apple.enter_details',
  ],
  google_wallet: [
    'card.digital_wallet_instructions.steps.reveal_card_details',
    'card.digital_wallet_instructions.steps.google.open_wallet',
    'card.digital_wallet_instructions.steps.google.choose_card',
    'card.digital_wallet_instructions.steps.google.enter_details',
  ],
};

const getWalletTypeForIndex = (index: number): WalletType =>
  index === APPLE_WALLET_INDEX ? 'apple_wallet' : 'google_wallet';

const DigitalWalletInstructionsSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const hasTrackedView = useRef(false);
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [activeIndex, setActiveIndex] = useState(
    Platform.OS === 'ios' ? APPLE_WALLET_INDEX : GOOGLE_WALLET_INDEX,
  );

  const walletType = getWalletTypeForIndex(activeIndex);

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'apple-wallet',
        label: strings('card.digital_wallet_instructions.apple_wallet'),
        content: null,
        testID: DigitalWalletInstructionsSheetSelectors.APPLE_WALLET_TAB,
      },
      {
        key: 'google-wallet',
        label: strings('card.digital_wallet_instructions.google_wallet'),
        content: null,
        testID: DigitalWalletInstructionsSheetSelectors.GOOGLE_WALLET_TAB,
      },
    ],
    [],
  );

  const steps = useMemo(
    () => STEP_KEYS[walletType].map((key) => strings(key)),
    [walletType],
  );

  useEffect(() => {
    if (hasTrackedView.current) {
      return;
    }
    hasTrackedView.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            screen: CardScreens.DIGITAL_WALLET_INSTRUCTIONS_SHEET,
            wallet_type: walletType,
          }),
        )
        .build(),
    );
  }, [createEventBuilder, trackEvent, walletType]);

  const handleTabPress = useCallback(
    (index: number) => {
      if (index === activeIndex) {
        return;
      }

      const nextWalletType = getWalletTypeForIndex(index);
      setActiveIndex(index);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: CardActions.DIGITAL_WALLET_INSTRUCTIONS_PLATFORM_SWITCH,
              wallet_type: nextWalletType,
            }),
          )
          .build(),
      );
    },
    [activeIndex, createEventBuilder, trackEvent],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
        <Box paddingBottom={6}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            twClassName="text-alternative px-4 pb-4"
            testID={DigitalWalletInstructionsSheetSelectors.DESCRIPTION}
          >
            {strings('card.digital_wallet_instructions.description')}
          </Text>

          <TabsBar
            tabs={tabs}
            activeIndex={activeIndex}
            onTabPress={handleTabPress}
            testID={DigitalWalletInstructionsSheetSelectors.TABS}
          />

          <Box
            gap={4}
            paddingHorizontal={4}
            paddingTop={6}
            testID={DigitalWalletInstructionsSheetSelectors.STEPS}
          >
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
    </BottomSheet>
  );
};

export default DigitalWalletInstructionsSheet;
