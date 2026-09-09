/**
 * Section titles quote the hex values their components hardcode so the gallery
 * is searchable by hex. No color is defined in this file — every swatch reads
 * either the constant exported by the component under review or the theme.
 */
/* eslint-disable @metamask/design-tokens/color-no-hex */
import React, {
  Component,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { PerpsMode, type Position } from '@metamask/perps-controller';
import type { Meta } from '@storybook/react-native';
import {
  NavigationContainer,
  NavigationIndependentTree,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import initialRootState from '../../util/test/initial-root-state';
import { initialState as initialRewardsState } from '../../reducers/rewards';
import Engine from '../../core/Engine/Engine';
import {
  colors as importedColors,
  onboardingCarouselColors,
} from '../../styles/common';
import { useTheme } from '../../util/theme';
import RankMedal from '../Views/Homepage/Sections/TopTraders/topRank/RankMedal';
import Toast, {
  ToastContext,
  ToastContextWrapper,
  ToastVariants,
} from '../../component-library/components/Toast';
import type {
  ToastOptions,
  ToastRef,
} from '../../component-library/components/Toast/Toast.types';
import { IconName } from '../../component-library/components/Icons/Icon';
import { strings } from '../../../locales/i18n';
import { createDepositErrorToast } from './Predict/utils/predictErrorHandler';
import CardImage from './Card/components/CardImage/CardImage';
import { CardStatus, CardType } from './Card/types';
import CardWelcome from './Card/Views/CardWelcome/CardWelcome';
import { GRADIENT_COLORS as CARD_WELCOME_GRADIENT_COLORS } from './Card/Views/CardWelcome/CardWelcome.styles';
import { CARD_DETAILS_CSS } from './Card/hooks/useCardDetailsToken';
import KYCPending from './Card/components/Onboarding/KYCPending';
import PerpsModeToggle from './Perps/components/PerpsModeToggle/PerpsModeToggle';
import { PERPS_PRO_GRADIENT } from './Perps/components/PerpsModeToggle/PerpsProGradientLabel';
import PerpsHeroCardView from './Perps/Views/PerpsHeroCardView/PerpsHeroCardView';
import PreviousSeasonLevel from './Rewards/components/PreviousSeason/PreviousSeasonLevel';
import RewardsReferralCodeTag from './Rewards/components/RewardsReferralCodeTag';
import { WinnerFinalizedBanner } from './Rewards/components/Campaigns/CampaignOutcomeBanners';
import { AMBIENT_NEGATIVE_COLOR } from './TokenDetails/components/abTestConfig';
import { ONBOARDING_GRADIENT_COLORS } from '../Views/SocialLeaderboard/Onboarding/SocialLeaderboardOnboarding.styles';
import MoneyBalanceIcon from '../../images/money-balance.svg';
import SecurityQuizLockImage from '../../images/security-quiz-intro-lock.svg';
import MarketOrderIcon from '../../images/perps/order-types/market.svg';
import TakeLimitOrderIcon from '../../images/perps/order-types/take-limit.svg';
import TakeMarketOrderIcon from '../../images/perps/order-types/take-market.svg';
import RewardsPointsIcon from '../../images/rewards/metamask-rewards-points.svg';
import RewardsPointsAlternativeIcon from '../../images/rewards/metamask-rewards-points-alternative.svg';
import RewardsTrophyIcon from '../../images/rewards/trophy.svg';

const scrollStyle = { paddingBottom: 96 };
const previewFrameStyle = { height: 560, overflow: 'hidden' as const };
const gestureRootStyle = { flex: 1 };
const toastPreviewFrameStyle = { marginHorizontal: -16 };
const gradientStripStyle = { height: 48, borderRadius: 12 };

/**
 * Storybook never boots the Engine, but PerpsHeroCardView's rewards hooks
 * subscribe to RewardsController events on mount, which throws
 * "Engine does not exist". Serve those reads inert doubles instead.
 */
const stubbedControllerMessenger = {
  subscribe: () => undefined,
  unsubscribe: () => undefined,
  call: () => Promise.resolve(null),
};

Object.defineProperties(Engine, {
  controllerMessenger: {
    configurable: true,
    get: () => stubbedControllerMessenger,
  },
  context: {
    configurable: true,
    get: () => ({}),
  },
});

const remoteFeatureFlagState =
  initialRootState.engine.backgroundState.RemoteFeatureFlagController;

const galleryEngine = {
  ...initialRootState.engine,
  backgroundState: {
    ...initialRootState.engine.backgroundState,
    RemoteFeatureFlagController: {
      ...remoteFeatureFlagState,
      remoteFeatureFlags: {
        ...remoteFeatureFlagState.remoteFeatureFlags,
        rewardsReferralCodeEnabled: true,
      },
    },
  },
};

const galleryRewardsState = {
  ...initialRewardsState,
  seasonId: 'season-1',
  seasonName: 'Season 1',
  seasonStatusLoading: false,
  seasonStatusError: null,
  referralCode: 'MM-4K2P',
  currentTier: {
    id: 'tier-1',
    name: 'Origin',
    pointsNeeded: 0,
    image: { lightModeUrl: '', darkModeUrl: '' },
    levelNumber: 'Level 1',
    rewards: [],
  },
};

const SAMPLE_HERO_POSITION: Position = {
  symbol: 'ETH',
  size: '2.5',
  marginUsed: '500',
  entryPrice: '2000',
  liquidationPrice: '1900',
  unrealizedPnl: '100',
  returnOnEquity: '0.20',
  leverage: { value: 10, type: 'isolated' },
  cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
  positionValue: '5000',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

/**
 * The shared Storybook store leaves `settings` undefined, which breaks the
 * haptics selectors PerpsModeToggle reads on every render.
 */
const galleryStore = configureStore({
  reducer: {
    engine: () => galleryEngine,
    user: () => initialRootState.user,
    settings: () => ({
      ...(initialRootState.settings ?? {}),
      hapticsEnabled: false,
    }),
    rewards: () => galleryRewardsState,
  },
});

const HeroPreviewStack = createNativeStackNavigator<{
  PerpsHeroCard: { position: Position; marketPrice?: string };
}>();

class PreviewErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Text variant={TextVariant.BodyXs} twClassName="text-error-default">
          {this.state.error.message}
        </Text>
      );
    }
    return this.props.children;
  }
}

const PerpsHeroCardPreview = () => (
  <View style={previewFrameStyle}>
    <NavigationIndependentTree>
      <NavigationContainer>
        <HeroPreviewStack.Navigator screenOptions={{ headerShown: false }}>
          <HeroPreviewStack.Screen
            name="PerpsHeroCard"
            component={PerpsHeroCardView}
            initialParams={{
              position: SAMPLE_HERO_POSITION,
              marketPrice: '$3,200.00',
            }}
          />
        </HeroPreviewStack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  </View>
);

/**
 * Toast positions itself absolutely within its parent, so a fixed-height frame
 * keeps a persistent toast inline instead of overlaying the gallery. The frame
 * cancels the horizontal page padding because Toast sets its own `left: 16`.
 */
const StaticToastPreview: React.FC<{
  options: ToastOptions;
  height?: number;
}> = ({ options, height = 92 }) => {
  const toastRef = useRef<ToastRef>(null);
  const { top } = useSafeAreaInsets();

  useEffect(() => {
    // Toast springs to `topInset + 8`; negate the inset to land in the frame.
    toastRef.current?.showToast({
      ...options,
      hasNoTimeout: true,
      customTopOffset: -top,
    });
  }, [options, top]);

  return (
    <View style={[toastPreviewFrameStyle, { height }]}>
      <Toast ref={toastRef} />
    </View>
  );
};

const Section: React.FC<{
  title: string;
  usage: string;
  children: React.ReactNode;
}> = ({ title, usage, children }) => (
  <Box twClassName="gap-2 border-t border-muted pt-4">
    <Text variant={TextVariant.HeadingSm}>{title}</Text>
    <Text variant={TextVariant.BodyXs} twClassName="text-alternative">
      {usage}
    </Text>
    <Box twClassName="pt-2">{children}</Box>
  </Box>
);

const Swatch: React.FC<{ label: string; color: string }> = ({
  label,
  color,
}) => (
  <Box twClassName="flex-1 gap-1">
    <Box twClassName="h-12 rounded-lg" style={{ backgroundColor: color }} />
    <Text variant={TextVariant.BodyXs} twClassName="text-alternative">
      {label}
    </Text>
  </Box>
);

const GradientStrip: React.FC<{ label: string; colors: string[] }> = ({
  label,
  colors,
}) => (
  <Box twClassName="flex-1 gap-1">
    <LinearGradient colors={colors} style={gradientStripStyle} />
    <Text variant={TextVariant.BodyXs} twClassName="text-alternative">
      {label}
    </Text>
  </Box>
);

const AssetRow: React.FC<{
  label: string;
  caption: string;
  children: React.ReactNode;
}> = ({ label, caption, children }) => (
  <Box twClassName="flex-row items-center gap-3 rounded-xl bg-muted p-4">
    {children}
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
        {label}
      </Text>
      <Text variant={TextVariant.BodyXs} twClassName="text-alternative">
        {caption}
      </Text>
    </Box>
  </Box>
);

const CarouselSlide: React.FC<{ slide: string }> = ({ slide }) => {
  const { background, color } = onboardingCarouselColors[slide];

  return (
    <Box
      twClassName="flex-1 rounded-xl p-4"
      style={{ backgroundColor: background }}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        style={{ color }}
      >
        {slide}
      </Text>
    </Box>
  );
};

const GroupHeading: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <Box twClassName="gap-1 pt-2">
    <Text variant={TextVariant.HeadingMd}>{title}</Text>
    <Text variant={TextVariant.BodySm} twClassName="text-alternative">
      {description}
    </Text>
  </Box>
);

const PaletteRow: React.FC<{
  name: string;
  light: string;
  normal: string;
  dark: string;
}> = ({ name, light, normal, dark }) => (
  <Box twClassName="gap-1">
    <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
      {name}
    </Text>
    <Box twClassName="flex-row gap-2">
      <Swatch label="light" color={light} />
      <Swatch label="normal" color={normal} />
      <Swatch label="dark" color={dark} />
    </Box>
  </Box>
);

const ModeToggleRow = () => {
  const [mode, setMode] = useState(PerpsMode.Lite);
  const [activeMode, setActiveMode] = useState(PerpsMode.Pro);

  return (
    <Box twClassName="gap-3 items-start">
      <PerpsModeToggle mode={mode} onChange={setMode} />
      <PerpsModeToggle
        mode={activeMode}
        variant="active"
        onChange={setActiveMode}
      />
    </Box>
  );
};

const AccentColorGallery = () => {
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);

  // Mirrors showSuccessToast in PerpsCloseAllPositionsView.
  const perpsSuccessToast: ToastOptions = useMemo(
    () => ({
      variant: ToastVariants.Icon,
      iconName: IconName.CheckBold,
      backgroundColor: colors.accent03.normal,
      iconColor: colors.accent03.dark,
      hasNoTimeout: true,
      labelOptions: [
        { label: strings('perps.close_all_modal.success_title'), isBold: true },
        { label: '\n', isBold: false },
        {
          label: strings('perps.close_all_modal.success_message', { count: 3 }),
          isBold: false,
        },
      ],
    }),
    [colors.accent03],
  );

  // Mirrors showErrorToast in PerpsCloseAllPositionsView.
  const perpsErrorToast: ToastOptions = useMemo(
    () => ({
      variant: ToastVariants.Icon,
      iconName: IconName.Warning,
      backgroundColor: colors.accent01.light,
      iconColor: colors.accent01.dark,
      hasNoTimeout: true,
      labelOptions: [
        { label: strings('perps.close_all_modal.error_title'), isBold: true },
        { label: '\n', isBold: false },
        { label: 'Insufficient margin', isBold: false },
      ],
    }),
    [colors.accent01],
  );

  // The real Predict factory, so this preview tracks production changes.
  const predictDepositErrorToast = useMemo(
    () =>
      createDepositErrorToast(
        { colors: { error: colors.error, accent04: colors.accent04 } },
        () => undefined,
      ) as ToastOptions,
    [colors.error, colors.accent04],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <ScrollView contentContainerStyle={scrollStyle}>
        <Box twClassName="gap-6 p-4">
          <Box twClassName="gap-1">
            <Text variant={TextVariant.HeadingMd}>Accent colors</Text>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              Every component that consumes accent01–accent04, in the active
              theme. Sections titled with a hex value quote the literal that
              consumer hardcodes, so compare them against the swatches above
              after switching theme.
            </Text>
          </Box>

          <Box twClassName="gap-3">
            <PaletteRow
              name="accent01"
              light={colors.accent01.light}
              normal={colors.accent01.normal}
              dark={colors.accent01.dark}
            />
            <PaletteRow
              name="accent02"
              light={colors.accent02.light}
              normal={colors.accent02.normal}
              dark={colors.accent02.dark}
            />
            <PaletteRow
              name="accent03"
              light={colors.accent03.light}
              normal={colors.accent03.normal}
              dark={colors.accent03.dark}
            />
            <PaletteRow
              name="accent04"
              light={colors.accent04.light}
              normal={colors.accent04.normal}
              dark={colors.accent04.dark}
            />
          </Box>

          <GroupHeading
            title="Theme token consumers"
            description="These read colors.accent0x, so they follow the active theme."
          />

          <Section
            title="PreviousSeason"
            usage="PreviousSeasonLevel rocket icon uses text-accent02-normal"
          >
            <PreviousSeasonLevel />
          </Section>

          <Section
            title="RewardsReferralCodeTag"
            usage="Default font color accent04.light"
          >
            <RewardsReferralCodeTag referralCode="MM-4K2P" />
          </Section>

          <Section
            title="PerpsHeroCardView"
            usage="Card fill accent04.dark, border accent04.normal, referral tag font accent04.light"
          >
            <PreviewErrorBoundary>
              <PerpsHeroCardPreview />
            </PreviewErrorBoundary>
          </Section>

          <Section
            title="KYCPending"
            usage="Full-screen background bg-accent04-dark"
          >
            <View style={previewFrameStyle}>
              <PreviewErrorBoundary>
                <KYCPending />
              </PreviewErrorBoundary>
            </View>
          </Section>

          <GroupHeading
            title="Hardcoded hex values"
            description="These bypass the theme, so they render the same color in light and dark."
          />

          <Section
            title="Hardcoded #BAF24A"
            usage="Perps order-type icons (dark exports; the -light exports use #457A39), the rewards toast trophy, and TradingViewChart.html up-candles, wicks and take-profit lines"
          >
            <Box twClassName="gap-3">
              <AssetRow
                label="Market order"
                caption="perps/order-types/market.svg"
              >
                <MarketOrderIcon name="market-order" width={32} height={32} />
              </AssetRow>
              <AssetRow
                label="Take profit limit"
                caption="perps/order-types/take-limit.svg"
              >
                <TakeLimitOrderIcon
                  name="take-limit-order"
                  width={32}
                  height={32}
                />
              </AssetRow>
              <AssetRow
                label="Take profit market"
                caption="perps/order-types/take-market.svg"
              >
                <TakeMarketOrderIcon
                  name="take-market-order"
                  width={32}
                  height={32}
                />
              </AssetRow>
              <AssetRow
                label="Rewards toast trophy"
                caption="rewards/trophy.svg — baked-in fill and stroke override useRewardsToast's color prop"
              >
                <RewardsTrophyIcon name="trophy" width={24} height={24} />
              </AssetRow>
            </Box>
          </Section>

          <Section
            title="Hardcoded #FF5C16"
            usage="Rewards points marks, the card-details orange (CardImageSection plus the CARD_DETAILS_CSS payload sent to the card provider), and AMBIENT_NEGATIVE_COLOR for negative price charts"
          >
            <Box twClassName="gap-3">
              <AssetRow
                label="Rewards points"
                caption="rewards/metamask-rewards-points.svg"
              >
                <RewardsPointsIcon
                  name="rewards-points"
                  width={24}
                  height={24}
                />
              </AssetRow>
              <AssetRow
                label="Rewards points (alternative)"
                caption="PreviousSeasonBalance, AddRewardsAccount"
              >
                <RewardsPointsAlternativeIcon
                  name="rewards-points-alternative"
                  width={24}
                  height={24}
                />
              </AssetRow>
              <Box twClassName="flex-row gap-2">
                <Swatch
                  label="AMBIENT_NEGATIVE_COLOR"
                  color={AMBIENT_NEGATIVE_COLOR}
                />
                <Swatch
                  label="CARD_DETAILS_CSS virtual"
                  color={CARD_DETAILS_CSS[CardType.VIRTUAL].cardBackgroundColor}
                />
              </Box>
            </Box>
          </Section>

          <Section
            title="Hardcoded #D075FF"
            usage="security-quiz-intro-lock.svg (RevealSRP) and the campaign banner border, which sweeps #D075FF → #FF5C16"
          >
            <Box twClassName="gap-3">
              <AssetRow
                label="SRP quiz lock"
                caption="images/security-quiz-intro-lock.svg"
              >
                <SecurityQuizLockImage
                  name="security-quiz-lock"
                  width={38}
                  height={40}
                />
              </AssetRow>
              <WinnerFinalizedBanner />
            </Box>
          </Section>

          <Section
            title="Hardcoded #EAC2FF and #D075FF"
            usage="PerpsProGradientLabel's Pro gradient and its solid mask color — accent02 light → normal. app/styles/common.ts also defines gettingStartedPageBackgroundColor as #EAC2FF, which no screen reads today."
          >
            <Box twClassName="gap-3">
              <ModeToggleRow />
              <GradientStrip
                label="PERPS_PRO_GRADIENT"
                colors={[...PERPS_PRO_GRADIENT]}
              />
            </Box>
          </Section>

          <Section
            title="Hardcoded #FF5C16, #FFA680, #661800 and #3D065F"
            usage="CardImage draws the card art from accent01 normal / light / dark; the metal card swaps the base fill for accent02.dark"
          >
            <Box twClassName="gap-3">
              <CardImage type={CardType.VIRTUAL} status={CardStatus.ACTIVE} />
              <CardImage type={CardType.METAL} status={CardStatus.ACTIVE} />
              <CardImage type={CardType.VIRTUAL} status={CardStatus.FROZEN} />
            </Box>
          </Section>

          <Section
            title="Hardcoded #3D065F"
            usage="CardWelcome and SocialLeaderboard onboarding backdrops, gettingStartedTextColor in app/styles/common.ts, and the physical / metal CARD_DETAILS_CSS payload. CardWelcome's own title copy already reads theme accent02.light."
          >
            <Box twClassName="gap-3">
              <Box twClassName="flex-row gap-2">
                <GradientStrip
                  label="CardWelcome"
                  colors={CARD_WELCOME_GRADIENT_COLORS}
                />
                <GradientStrip
                  label="SocialLeaderboard"
                  colors={ONBOARDING_GRADIENT_COLORS}
                />
              </Box>
              <Box twClassName="flex-row gap-2">
                <Swatch
                  label="gettingStartedTextColor"
                  color={importedColors.gettingStartedTextColor}
                />
                <Swatch
                  label="CARD_DETAILS_CSS physical"
                  color={
                    CARD_DETAILS_CSS[CardType.PHYSICAL].cardBackgroundColor
                  }
                />
              </Box>
              <View style={previewFrameStyle}>
                <PreviewErrorBoundary>
                  <CardWelcome />
                </PreviewErrorBoundary>
              </View>
            </Box>
          </Section>

          <Section
            title="Hardcoded #CCE7FF and #190066"
            usage="money-balance.svg card fill and glyph — rendered by Earn, Card, Money and Trending"
          >
            <AssetRow
              label="Money balance"
              caption="app/images/money-balance.svg"
            >
              <MoneyBalanceIcon name="money-balance" width={40} height={40} />
            </AssetRow>
          </Section>

          <Section
            title="Hardcoded #89B0FF, #CCE7FF and #FFA680"
            usage="rank-badge-3.svg — ribbon, ribbon fold and medallion fills. RankMedal renders the Figma export verbatim, so props cannot retheme them."
          >
            <AssetRow
              label="RankMedal rank 3"
              caption="TopTraders podium badge"
            >
              <RankMedal rank={3} size={48} />
            </AssetRow>
          </Section>

          <Section
            title="Hardcoded #E5FFC3, #FFA680 and #CCE7FF"
            usage="onboardingCarouselColors slide backgrounds in app/styles/common.ts, with #190066 and #3D065F copy. The map is currently unreferenced by production screens."
          >
            <Box twClassName="flex-row gap-2">
              <CarouselSlide slide="one" />
              <CarouselSlide slide="two" />
              <CarouselSlide slide="three" />
            </Box>
          </Section>

          <Section
            title="Hardcoded #013330"
            usage="No hardcoded usages — accent03.dark only reaches the UI through the theme token, as in the Perps close-all success toast below"
          >
            <Box twClassName="flex-row gap-2">
              <Swatch
                label="colors.accent03.dark"
                color={colors.accent03.dark}
              />
            </Box>
          </Section>

          <GroupHeading
            title="Toasts"
            description="Theme token consumers, kept together at the end because each preview needs its own fixed-height frame."
          />

          <Section
            title="Perps close-all success toast"
            usage="Icon background accent03.normal, glyph accent03.dark"
          >
            <StaticToastPreview options={perpsSuccessToast} />
          </Section>

          <Section
            title="Perps close-all error toast"
            usage="Icon background accent01.light, glyph accent01.dark"
          >
            <StaticToastPreview options={perpsErrorToast} />
          </Section>

          <Section
            title="Predict deposit error toast"
            usage="Icon background accent04.normal, glyph error.default — same palette as the Predict claim error toast"
          >
            <StaticToastPreview
              options={predictDepositErrorToast}
              height={128}
            />
          </Section>
        </Box>
      </ScrollView>
      <Toast ref={toastRef} />
    </Box>
  );
};

const AccentColorGalleryMeta = {
  title: 'Components / UI / Accent Colors / Gallery',
  component: AccentColorGallery,
  decorators: [
    (Story: React.ComponentType) => (
      // Storybook skips Views/Root, so Toast's swipe GestureDetector would
      // otherwise render without a gesture-handler root.
      <GestureHandlerRootView style={gestureRootStyle}>
        <Provider store={galleryStore}>
          <ToastContextWrapper>
            <Story />
          </ToastContextWrapper>
        </Provider>
      </GestureHandlerRootView>
    ),
  ],
} as Meta<typeof AccentColorGallery>;

export default AccentColorGalleryMeta;

export const AllAccentComponents = {};
