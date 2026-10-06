import React, { useRef, useState } from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  Theme,
  ThemeProvider,
  useTailwind,
} from '@metamask/design-system-twrnc-preset';
import { brandColor, darkTheme } from '@metamask/design-tokens';
import { strings } from '../../../../../../locales/i18n';
import { ThemeContext } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import CtaButton from '../../components/CtaButton';
import UsdcAmount from '../../components/UsdcAmount';
import { formatUsdcAmount } from '../../providers/collector-crypt/utils/format';
import { BuybackStep, CollectStep } from './GachaOnboarding.steps';
import { GachaOnboardingSelectorsIDs } from './GachaOnboarding.testIds';
import type { GachaOnboardingProps } from './GachaOnboarding.types';

const STEP_TITLES = ['what_this_is', 'how_buyback_works', 'before_you_start'];
const ONBOARDING_THEME = {
  ...darkTheme,
  brandColors: brandColor,
  themeAppearance: AppThemeKey.dark,
};

/** Three onboarding steps; funding leaves the last step open until OK is pressed. */
const GachaOnboardingContent = ({
  balance,
  onFund,
  onComplete,
  onClose,
  isFunding = false,
}: GachaOnboardingProps) => {
  const tw = useTailwind();
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLastStep = step === STEP_TITLES.length - 1;

  const goToStep = (nextStep: number) => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setStep(nextStep);
  };

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={GachaOnboardingSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={strings(`gacha.onboarding.${STEP_TITLES[step]}`)}
        titleProps={{
          variant: TextVariant.HeadingMd,
          testID: GachaOnboardingSelectorsIDs.TITLE,
          accessibilityRole: 'header',
        }}
        onBack={step > 0 ? () => goToStep(step - 1) : undefined}
        backButtonProps={
          step > 0 ? { testID: GachaOnboardingSelectorsIDs.BACK } : undefined
        }
        onClose={onClose}
        closeButtonProps={{ testID: GachaOnboardingSelectorsIDs.CLOSE }}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        paddingHorizontal={5}
        paddingVertical={4}
        gap={3}
      >
        <Box flexDirection={BoxFlexDirection.Row} gap={1} twClassName="flex-1">
          {STEP_TITLES.map((title, index) => (
            <Box
              key={title}
              twClassName={`flex-1 h-1 rounded-full ${index <= step ? 'bg-success-default' : 'bg-muted'}`}
            />
          ))}
        </Box>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={GachaOnboardingSelectorsIDs.PROGRESS}
          accessibilityLiveRegion="polite"
        >
          {strings('gacha.onboarding.step', {
            step: step + 1,
            total: STEP_TITLES.length,
          })}
        </Text>
      </Box>
      <ScrollView
        ref={scrollRef}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('grow justify-center px-5 py-6')}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        {step === 0 && <CollectStep />}
        {step === 1 && <BuybackStep />}
        {isLastStep && (
          <Box gap={4}>
            <Text variant={TextVariant.HeadingLg} accessibilityRole="header">
              {strings('gacha.onboarding.before_you_start')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('gacha.onboarding.solana_description')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              padding={4}
              gap={3}
              twClassName="bg-info-muted rounded-2xl border border-info-default/30"
            >
              <Box padding={3} twClassName="bg-info-muted rounded-xl">
                <Icon
                  name={IconName.ShieldLock}
                  color={IconColor.InfoDefault}
                />
              </Box>
              <Box gap={1} twClassName="flex-1">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('gacha.onboarding.solana_account')}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('gacha.onboarding.solana_account_description')}
                </Text>
              </Box>
            </Box>
            <Box
              padding={4}
              gap={3}
              twClassName="bg-muted border border-muted rounded-2xl"
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('gacha.onboarding.balance')}
              </Text>
              <UsdcAmount
                amount={formatUsdcAmount(balance)}
                variant={TextVariant.HeadingLg}
                testID={GachaOnboardingSelectorsIDs.BALANCE}
              />
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings(
                  balance === 0n
                    ? 'gacha.onboarding.empty_balance'
                    : 'gacha.onboarding.fund_description',
                )}
              </Text>
              <Button
                variant={ButtonVariant.Secondary}
                isFullWidth
                isDisabled={isFunding}
                onPress={onFund}
                testID={GachaOnboardingSelectorsIDs.FUND}
              >
                {strings('gacha.onboarding.fund')}
              </Button>
            </Box>
          </Box>
        )}
      </ScrollView>
      <Box paddingHorizontal={5} paddingVertical={4}>
        <CtaButton
          label={strings(
            isLastStep ? 'gacha.onboarding.complete' : 'gacha.onboarding.next',
          )}
          onPress={isLastStep ? onComplete : () => goToStep(step + 1)}
          testID={
            isLastStep
              ? GachaOnboardingSelectorsIDs.COMPLETE
              : GachaOnboardingSelectorsIDs.NEXT
          }
        />
      </Box>
    </SafeAreaView>
  );
};

/** Keeps the onboarding artwork and lime controls consistent in every app theme. */
const GachaOnboarding = (props: GachaOnboardingProps) => (
  <ThemeContext.Provider value={ONBOARDING_THEME}>
    <ThemeProvider theme={Theme.Dark}>
      <StatusBar barStyle="light-content" />
      <GachaOnboardingContent {...props} />
    </ThemeProvider>
  </ThemeContext.Provider>
);

export default GachaOnboarding;
