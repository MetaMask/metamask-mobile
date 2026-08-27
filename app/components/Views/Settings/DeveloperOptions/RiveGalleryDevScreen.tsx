/* eslint-disable react-native/no-color-literals, @metamask/design-tokens/color-no-hex -- TEMP dev-only screen, removed before shipping */
// TEMP (Rive device testing) — remove before shipping.
// One-stop dev gallery that renders every Rive animation in the app so the
// Nitro runtime migration can be exercised without hunting down each entry
// point. Reachable from Settings → Developer Options → "Rive animations
// gallery". Screens that need their own route/params (Money onboarding,
// first-time deposit, Perps tutorial, Social Leaderboard NUX) are opened via
// navigation instead of inline.
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';

import FoxLoader from '../../../UI/FoxLoader/FoxLoader';
import FoxAnimation from '../../../UI/FoxAnimation/FoxAnimation';
// eslint-disable-next-line import-x/no-restricted-paths -- TEMP dev-only gallery, removed before shipping
import FoxRiveLoaderAnimation from '../../ChoosePassword/FoxRiveLoaderAnimation/FoxRiveLoaderAnimation';
// eslint-disable-next-line import-x/no-restricted-paths -- TEMP dev-only gallery, removed before shipping
import OnboardingSuccessEndAnimation from '../../OnboardingSuccess/OnboardingSuccessEndAnimation';
import OnboardingAnimation from '../../../UI/OnboardingAnimation/OnboardingAnimation';
import MoneyCardFlipAnimation from '../../../UI/Money/components/MoneyCardFlipAnimation/MoneyCardFlipAnimation';
import MoneyCardTiltAnimation from '../../../UI/Money/components/MoneyCardTiltAnimation/MoneyCardTiltAnimation';
import MoneyNextBestActionParallax, {
  PARALLAX_ARTBOARD_CARD,
  PARALLAX_ARTBOARD_FUND,
} from '../../../UI/Money/components/MoneyNextBestActionParallax';
import { HwSwapAnimation } from '../../../UI/HardwareWallet/Swaps/HwSwapAnimation';
import {
  HardwareWalletsSwapsStatus,
  initialHardwareWalletsSwapsState,
} from '../../../UI/HardwareWallet/Swaps/HardwareWalletsSwaps.state';
// eslint-disable-next-line import-x/no-restricted-paths -- TEMP dev-only gallery, removed before shipping
import SearchingForDevice from '../../ConnectHardware/SearchingForDevice';
// eslint-disable-next-line import-x/no-restricted-paths -- TEMP dev-only gallery, removed before shipping
import DiscoveryErrorScreen from '../../ConnectHardware/HardwareWalletDiscoveryFlow/screens/errors/DiscoveryErrorScreen';
import { StackCardEmpty } from '../../../UI/Carousel/StackCardEmpty/StackCardEmpty';
import RewardPointsAnimation from '../../../UI/Rewards/components/RewardPointsAnimation';

import moneyOnboardingStepperStep1 from '../../../../images/money-onboarding-stepper-step-1.png';
import moneyOnboardingStepperStep2 from '../../../../images/money-onboarding-stepper-step-2.png';

const noop = () => undefined;

const styles = StyleSheet.create({
  viewer: { flex: 1 },
  viewerLight: { flex: 1, backgroundColor: '#FFFFFF' },
  viewerDark: { backgroundColor: '#14103C' },
  viewerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  toolbarText: { fontSize: 14, fontWeight: '600', color: '#4459FF' },
  viewerTitle: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  viewerNote: { fontSize: 12, paddingHorizontal: 16, paddingTop: 2 },
  textOnDark: { color: '#FFFFFF' },
  stage: { flex: 1 },
  listTitle: { fontSize: 16, fontWeight: '700' },
  listContent: { paddingBottom: 32 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.6,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  rowText: { fontSize: 14 },
});

/** OnboardingAnimation needs children + start flag; wrap so it autoplays. */
const OnboardingAnimationDemo: React.FC = () => (
  <OnboardingAnimation startOnboardingAnimation setStartFoxAnimation={noop}>
    <View />
  </OnboardingAnimation>
);

/** StackCardEmpty needs Animated.Values owned by the carousel; fake them. */
const StackCardEmptyDemo: React.FC = () => {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const nextCardBgOpacity = useRef(new Animated.Value(0)).current;
  return (
    <StackCardEmpty
      emptyStateOpacity={opacity}
      emptyStateScale={scale}
      emptyStateTranslateY={translateY}
      nextCardBgOpacity={nextCardBgOpacity}
      onTransitionToEmpty={noop}
    />
  );
};

interface InlineEntry {
  key: string;
  title: string;
  note?: string;
  Component: React.ComponentType;
}

const INLINE_ENTRIES: InlineEntry[] = [
  {
    key: 'fox-loader',
    title: 'FoxLoader — splash/loading fox',
    note: 'Uses module-level start/complete flags; may auto-skip on remount',
    Component: () => <FoxLoader appServicesReady onAnimationComplete={noop} />,
  },
  {
    key: 'fox-animation',
    title: 'FoxAnimation — login/unlock fox',
    Component: () => <FoxAnimation hasFooter={false} trigger="Start" />,
  },
  {
    key: 'onboarding-animation',
    title: 'OnboardingAnimation — fox → wordmark',
    note: 'Dark-mode variant: flip device appearance, then remount',
    Component: OnboardingAnimationDemo,
  },
  {
    key: 'fox-rive-loader',
    title: 'FoxRiveLoaderAnimation — ChoosePassword loading fox',
    Component: () => <FoxRiveLoaderAnimation />,
  },
  {
    key: 'onboarding-success-end',
    title: 'OnboardingSuccessEndAnimation — success end screen',
    Component: () => (
      <OnboardingSuccessEndAnimation onAnimationComplete={noop} />
    ),
  },
  {
    key: 'money-card-flip-virtual',
    title: 'MoneyCardFlipAnimation — virtual (orange)',
    Component: () => <MoneyCardFlipAnimation isMetalCard={false} />,
  },
  {
    key: 'money-card-flip-metal',
    title: 'MoneyCardFlipAnimation — metal (purple)',
    Component: () => <MoneyCardFlipAnimation isMetalCard />,
  },
  {
    key: 'money-card-tilt-virtual',
    title: 'MoneyCardTiltAnimation — virtual (digital artboard)',
    note: 'Tilt needs a real device; static render is the sim check',
    Component: () => <MoneyCardTiltAnimation isMetalCard={false} />,
  },
  {
    key: 'money-card-tilt-metal',
    title: 'MoneyCardTiltAnimation — metal artboard',
    note: 'Tilt needs a real device; static render is the sim check',
    Component: () => <MoneyCardTiltAnimation isMetalCard />,
  },
  {
    key: 'money-parallax-fund',
    title: 'MoneyNextBestActionParallax — Fund artboard',
    note: 'Tilt needs a real device; static render is the sim check',
    Component: () => (
      <MoneyNextBestActionParallax
        artboardName={PARALLAX_ARTBOARD_FUND}
        fallbackImage={moneyOnboardingStepperStep1}
      />
    ),
  },
  {
    key: 'money-parallax-card',
    title: 'MoneyNextBestActionParallax — Card artboard',
    Component: () => (
      <MoneyNextBestActionParallax
        artboardName={PARALLAX_ARTBOARD_CARD}
        fallbackImage={moneyOnboardingStepperStep2}
      />
    ),
  },
  {
    key: 'reward-points',
    title: 'RewardPointsAnimation — points counter',
    note: 'Production-size (16px icon) as used in Bridge QuoteDetailsCard',
    Component: () => <RewardPointsAnimation value={1234} />,
  },
  {
    key: 'hw-swap',
    title: 'HwSwapAnimation — HW swap signing (Waiting)',
    Component: () => (
      <HwSwapAnimation
        progress={{
          ...initialHardwareWalletsSwapsState,
          status: HardwareWalletsSwapsStatus.Waiting,
        }}
      />
    ),
  },
  {
    key: 'hw-searching',
    title: 'SearchingForDevice — HW connect searching',
    Component: () => <SearchingForDevice />,
  },
  {
    key: 'hw-discovery-error',
    title: 'DiscoveryErrorScreenLayout — HW connect error',
    Component: () => (
      <DiscoveryErrorScreen variant="something-went-wrong" onRetry={noop} />
    ),
  },
  {
    key: 'stack-card-empty',
    title: 'StackCardEmpty — carousel empty state + confetti',
    Component: StackCardEmptyDemo,
  },
];

const RiveGalleryDevScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [active, setActive] = useState<InlineEntry | null>(null);
  const [mountKey, setMountKey] = useState(0);
  const [darkBg, setDarkBg] = useState(false);

  const close = useCallback(() => setActive(null), []);
  const remount = useCallback(() => setMountKey((k) => k + 1), []);
  const toggleBg = useCallback(() => setDarkBg((d) => !d), []);

  const navEntries = [
    {
      key: 'money-onboarding',
      title: 'MoneyOnboardingView — Money/Card onboarding (route)',
      onPress: () => navigation.navigate(Routes.MONEY.ONBOARDING),
    },
    {
      key: 'money-first-time-deposit',
      title: 'MoneyFirstTimeDepositView — first-time deposit (route)',
      onPress: () => navigation.navigate(Routes.MONEY.FIRST_TIME_DEPOSIT),
    },
    {
      key: 'perps-tutorial',
      title: 'PerpsTutorialCarousel — Perps tutorial (route)',
      onPress: () => navigation.navigate(Routes.PERPS.TUTORIAL),
    },
    {
      key: 'slb-onboarding',
      title: 'SocialLeaderboardOnboarding — NUX (route)',
      onPress: () => navigation.navigate(Routes.SOCIAL_LEADERBOARD.ONBOARDING),
    },
  ];

  if (active) {
    const Active = active.Component;
    return (
      <SafeAreaView
        style={[styles.viewer, darkBg ? styles.viewerDark : styles.viewerLight]}
      >
        <View style={styles.viewerToolbar}>
          <TouchableOpacity onPress={close} style={styles.toolbarButton}>
            <Text style={styles.toolbarText}>{'‹ Back'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={remount} style={styles.toolbarButton}>
            <Text style={styles.toolbarText}>{'Remount'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleBg} style={styles.toolbarButton}>
            <Text style={styles.toolbarText}>
              {darkBg ? 'Light bg' : 'Dark bg'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.viewerTitle, darkBg && styles.textOnDark]}>
          {active.title}
        </Text>
        {active.note ? (
          <Text style={[styles.viewerNote, darkBg && styles.textOnDark]}>
            {active.note}
          </Text>
        ) : null}
        <View style={styles.stage} key={mountKey}>
          <Active />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.viewerLight}>
      <View style={styles.viewerToolbar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.toolbarButton}
        >
          <Text style={styles.toolbarText}>{'‹ Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.listTitle}>{'Rive gallery (TEMP)'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.listContent}>
        <Text style={styles.sectionHeader}>{'Inline'}</Text>
        {INLINE_ENTRIES.map((entry) => (
          <TouchableOpacity
            key={entry.key}
            style={styles.row}
            onPress={() => {
              setMountKey((k) => k + 1);
              setActive(entry);
            }}
          >
            <Text style={styles.rowText}>{entry.title}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.sectionHeader}>{'Full screens (navigate)'}</Text>
        {navEntries.map((entry) => (
          <TouchableOpacity
            key={entry.key}
            style={styles.row}
            onPress={entry.onPress}
          >
            <Text style={styles.rowText}>{entry.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default RiveGalleryDevScreen;
