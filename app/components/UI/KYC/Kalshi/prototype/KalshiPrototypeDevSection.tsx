// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PROTOTYPE_COPY,
  PROTOTYPE_SCENARIO_IDS,
  PROTOTYPE_SCENARIOS,
  type PrototypeScenarioId,
} from './prototypeConstants';
import {
  activateKalshiPrototypeScenario,
  resetKalshiPrototype,
  resolveKalshiPrototypeDecision,
  setKalshiPrototypeCodeSendsFail,
} from './prototypeRuntime';
import { useKalshiPrototypeRuntime } from './useKalshiPrototype';
import { KalshiPrototypeDevSectionSelectorsIDs } from './KalshiPrototypeDevSection.testIds';

/**
 * The Developer Options row for the Kalshi onboarding prototype. Turning it
 * on installs the fake backend and opens the prototype's scaled-back
 * Predictions screen, whose status card starts (or resumes) the flow; each
 * scenario button pre-arms a path. `Reset prototype` tears the fake down
 * again, and the resolve control settles a pending review the way kyc-api's
 * next poll would.
 *
 * @returns The section, or `null` outside development builds.
 */
const KalshiPrototypeDeveloperOptionsSection = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const runtime = useKalshiPrototypeRuntime();
  const copy = PROTOTYPE_COPY.devOptions;

  if (!__DEV__) {
    return null;
  }

  const isReviewPending =
    runtime.script?.vendor.step === 'decision' &&
    runtime.script.vendor.status === 'pending';

  // Each scenario installs the fakes and opens the prototype Predictions
  // screen; its status card starts (or resumes) the flow.
  const startScenario = (scenario: PrototypeScenarioId) => {
    activateKalshiPrototypeScenario(scenario);
    navigation.navigate(Routes.SETTINGS.KALSHI_PROTOTYPE_HOME);
  };

  return (
    <Box
      twClassName="gap-3 px-4 pb-6"
      testID={KalshiPrototypeDevSectionSelectorsIDs.SECTION}
    >
      <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
        {copy.title}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {PROTOTYPE_COPY.picker.description}
      </Text>
      {PROTOTYPE_SCENARIO_IDS.map((scenario) => (
        <Button
          key={scenario}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() => startScenario(scenario)}
          testID={`${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-${scenario}`}
        >
          {PROTOTYPE_SCENARIOS[scenario].title}
        </Button>
      ))}
      {isReviewPending ? (
        <Box twClassName="gap-3">
          <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
            {copy.resolveReview.title}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => resolveKalshiPrototypeDecision('approved')}
            testID={KalshiPrototypeDevSectionSelectorsIDs.RESOLVE_VERIFIED}
          >
            {copy.resolveReview.verified}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => resolveKalshiPrototypeDecision('rejected')}
            testID={KalshiPrototypeDevSectionSelectorsIDs.RESOLVE_CANT_VERIFY}
          >
            {copy.resolveReview.cantVerify}
          </Button>
        </Box>
      ) : null}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={() => setKalshiPrototypeCodeSendsFail(!runtime.failCodeSends)}
        testID={KalshiPrototypeDevSectionSelectorsIDs.FAIL_CODE_SENDS}
      >
        {runtime.failCodeSends ? copy.failCodeSendsOn : copy.failCodeSends}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={() => resetKalshiPrototype()}
        testID={KalshiPrototypeDevSectionSelectorsIDs.RESET}
      >
        {copy.reset}
      </Button>
    </Box>
  );
};

export default KalshiPrototypeDeveloperOptionsSection;
