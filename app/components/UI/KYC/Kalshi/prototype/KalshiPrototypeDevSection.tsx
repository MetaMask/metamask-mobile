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
} from './prototypeRuntime';
import { KalshiPrototypeDevSectionSelectorsIDs } from './KalshiPrototypeDevSection.testIds';

/**
 * The Developer Options row for the Kalshi onboarding prototype. Turning it
 * on installs the fake backend and opens the prototype's scaled-back
 * Predictions screen, whose get-started card starts the flow; the scenario
 * sheet pre-arms a path for leg 2's scripted scenarios. `Reset prototype`
 * tears the fake down again.
 *
 * @returns The section, or `null` outside development builds.
 */
const KalshiPrototypeDeveloperOptionsSection = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const copy = PROTOTYPE_COPY.devOptions;

  if (!__DEV__) {
    return null;
  }

  // Each scenario installs the fakes and opens the prototype Predictions
  // screen; its get-started card starts the flow.
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
