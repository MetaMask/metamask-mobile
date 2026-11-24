// PROTOTYPE-DO-NOT-MERGE
// Paper screens: KP-01, KP-27 (see prototypeScreens.ts)
import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  HeaderStandard,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import {
  deriveKalshiPrototypeCardState,
  dismissKalshiPrototypeCard,
  getKalshiPrototypeVendorOnboarding,
} from './prototypeRuntime';
import { PROTOTYPE_HOME_POLL_MS } from './prototypeConstants';
import { useKalshiPrototypeRuntime } from './useKalshiPrototype';
import KalshiPrototypeStatusCard from './KalshiPrototypeStatusCard';
import { KalshiPrototypePredictionsHomeSelectorsIDs } from './KalshiPrototypePredictionsHome.testIds';

/** The dummy event cards below the get-started card. Static on purpose. */
const TRENDING_EVENT = {
  title: 'Panthers vs. Eagles',
  score: 'Panthers 14 — Eagles 10',
  outcomes: [{ label: 'Panthers · 63¢' }, { label: 'Eagles · 37¢' }],
} as const;

const SPORTS_EVENTS = [
  {
    title: 'Lakers vs. Celtics',
    score: 'Lakers 102 — Celtics 99',
    outcomes: [{ label: 'Lakers · 55¢' }, { label: 'Celtics · 45¢' }],
  },
] as const;

const SectionHeader = ({ title }: { title: string }) => (
  <Text
    variant={TextVariant.HeadingSm}
    fontWeight={FontWeight.Bold}
    color={TextColor.TextDefault}
  >
    {title}
  </Text>
);

const OutcomeButtons = ({
  outcomes,
}: {
  outcomes: readonly { label: string }[];
}) => (
  <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
    {outcomes.map((outcome) => (
      <Box key={outcome.label} twClassName="flex-1">
        <ButtonBase
          size={ButtonBaseSize.Sm}
          isFullWidth
          twClassName="bg-muted"
          textProps={{ twClassName: 'text-default' }}
          accessibilityRole="button"
        >
          {outcome.label}
        </ButtonBase>
      </Box>
    ))}
  </Box>
);

const EventCard = ({
  title,
  score,
  outcomes,
  testID,
}: {
  title: string;
  score: string;
  outcomes: readonly { label: string }[];
  testID: string;
}) => (
  <Box twClassName="rounded-xl bg-section p-4 gap-2" testID={testID}>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
    >
      {title}
    </Text>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {score}
    </Text>
    <OutcomeButtons outcomes={outcomes} />
  </Box>
);

/**
 * The prototype's start screen: the scaled-back Predictions main view from
 * the dev-handover design. The status card shows where the Kalshi
 * verification stands and continues the flow from there; the sections are
 * static dummy data.
 *
 * @returns The screen.
 */
const KalshiPrototypePredictionsHome = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const runtime = useKalshiPrototypeRuntime();
  const cardState = deriveKalshiPrototypeCardState(runtime.script);
  // The entry card hides for this visit; the terminal states' dismissal
  // lives in the runtime, until the scenario resets.
  const [isEntryCardDismissed, setIsEntryCardDismissed] = useState(false);

  const startFlow = useCallback(() => {
    navigation.navigate(Routes.SETTINGS.KALSHI_PROTOTYPE_ONBOARDING);
  }, [navigation]);

  // While the review is pending and this screen is in front, poll the fake
  // the way the app would, so the card turns to verified (or can't verify)
  // on its own after the verifying screen was closed.
  const isVerifying = cardState === 'verifying';
  useFocusEffect(
    useCallback(() => {
      if (!isVerifying) {
        return undefined;
      }
      const timer = setInterval(() => {
        void getKalshiPrototypeVendorOnboarding().refreshStep({
          vendor: 'kalshi',
        });
      }, PROTOTYPE_HOME_POLL_MS);
      return () => clearInterval(timer);
    }, [isVerifying]),
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={KalshiPrototypePredictionsHomeSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        onBack={() => navigation.goBack()}
        includesTopInset
        endButtonIconProps={[
          { iconName: IconName.Filter, onPress: () => undefined },
          { iconName: IconName.Search, onPress: () => undefined },
        ]}
      />
      <ScrollView contentContainerStyle={tw.style('px-4 pb-6 gap-4')}>
        <Text variant={TextVariant.HeadingLg}>Predictions</Text>
        {runtime.cardDismissed ||
        (cardState === 'getStarted' && isEntryCardDismissed) ? null : (
          <KalshiPrototypeStatusCard
            state={cardState}
            onPress={startFlow}
            onClose={
              cardState === 'getStarted'
                ? () => setIsEntryCardDismissed(true)
                : dismissKalshiPrototypeCard
            }
            testID={KalshiPrototypePredictionsHomeSelectorsIDs.GET_STARTED_CARD}
          />
        )}
        <SectionHeader title="Trending" />
        <EventCard
          title={TRENDING_EVENT.title}
          score={TRENDING_EVENT.score}
          outcomes={TRENDING_EVENT.outcomes}
          testID={KalshiPrototypePredictionsHomeSelectorsIDs.TRENDING_EVENT}
        />
        <SectionHeader title="Sports" />
        {SPORTS_EVENTS.map((event) => (
          <EventCard
            key={event.title}
            title={event.title}
            score={event.score}
            outcomes={event.outcomes}
            testID={`${KalshiPrototypePredictionsHomeSelectorsIDs.SPORTS_EVENT}-${event.title}`}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default KalshiPrototypePredictionsHome;
