// PROTOTYPE-DO-NOT-MERGE
import React, { useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  ContentVariant,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PROTOTYPE_COPY,
  PROTOTYPE_SCENARIO_IDS,
  PROTOTYPE_SCENARIOS,
  type PrototypeScenarioId,
} from './prototypeConstants';
import {
  activateKalshiPrototype,
  activateKalshiPrototypeScenario,
  resetKalshiPrototype,
} from './prototypeRuntime';
import { useKalshiPrototypeRuntime } from './useKalshiPrototype';
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
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const runtime = useKalshiPrototypeRuntime();
  const sheetRef = useRef<BottomSheetRef>(null);
  const copy = PROTOTYPE_COPY.devOptions;

  if (!__DEV__) {
    return null;
  }

  const enterPrototype = () => {
    activateKalshiPrototype();
    navigation.navigate(Routes.SETTINGS.KALSHI_PROTOTYPE_HOME);
  };

  const pickScenario = (scenario: PrototypeScenarioId) => {
    activateKalshiPrototypeScenario(scenario);
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.SETTINGS.KALSHI_PROTOTYPE_ONBOARDING);
    });
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
        {copy.description}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={enterPrototype}
        testID={KalshiPrototypeDevSectionSelectorsIDs.ENTER}
      >
        {runtime.active ? `${copy.enter} again` : copy.enter}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={() => {
          sheetRef.current?.onOpenBottomSheet();
        }}
        testID={KalshiPrototypeDevSectionSelectorsIDs.SHEET}
      >
        Scenarios
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={() => resetKalshiPrototype()}
        isDisabled={!runtime.active}
        testID={KalshiPrototypeDevSectionSelectorsIDs.RESET}
      >
        {copy.reset}
      </Button>
      <BottomSheet
        ref={sheetRef}
        onClose={() => undefined}
        testID={KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_SHEET}
      >
        <BottomSheetHeader
          onClose={() => sheetRef.current?.onCloseBottomSheet()}
        />
        <Box twClassName="pb-4">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="px-4 pb-2"
          >
            {PROTOTYPE_COPY.picker.description}
          </Text>
          {PROTOTYPE_SCENARIO_IDS.map((scenario) => (
            <ListItemSelect
              key={scenario}
              isSelected={runtime.scenario === scenario}
              variant={ContentVariant.MultiLine}
              title={PROTOTYPE_SCENARIOS[scenario].title}
              description={PROTOTYPE_SCENARIOS[scenario].description}
              onPress={() => pickScenario(scenario)}
              testID={`${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-${scenario}`}
            />
          ))}
          <Box twClassName="px-4 pt-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={() => {
                resetKalshiPrototype();
                sheetRef.current?.onCloseBottomSheet();
              }}
              testID={KalshiPrototypeDevSectionSelectorsIDs.RESET}
            >
              {PROTOTYPE_COPY.devOptions.reset}
            </Button>
          </Box>
        </Box>
      </BottomSheet>
    </Box>
  );
};

export default KalshiPrototypeDeveloperOptionsSection;
