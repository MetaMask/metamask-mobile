// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  ActionListItem,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  SectionHeader,
  Switch,
  Text,
  TextColor,
  TextVariant,
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
  activateKalshiPrototypeScenario,
  resetKalshiPrototype,
  resolveKalshiPrototypeDecision,
  setKalshiPrototypeCodeSendsFail,
  setKalshiPrototypeSumsubLaunchFail,
} from './prototypeRuntime';
import { useKalshiPrototypeRuntime } from './useKalshiPrototype';
import { KalshiPrototypeDevSectionSelectorsIDs } from './KalshiPrototypeDevSection.testIds';

/**
 * The Kalshi prototype's own settings screen, opened from its single
 * Developer Options row. Groups the controls: start a scenario, resolve a
 * pending review (only while one is pending, the way kyc-api's next poll
 * would), simulate failures, and reset the fake backend.
 *
 * @returns The screen, or `null` outside development builds.
 */
const KalshiPrototypeSettings = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const runtime = useKalshiPrototypeRuntime();
  const tw = useTailwind();
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

  const resolveOptions = [
    {
      decision: 'approved' as const,
      label: copy.resolveReview.verified,
      testID: KalshiPrototypeDevSectionSelectorsIDs.RESOLVE_VERIFIED,
    },
    {
      decision: 'rejected' as const,
      label: copy.resolveReview.cantVerify,
      testID: KalshiPrototypeDevSectionSelectorsIDs.RESOLVE_CANT_VERIFY,
    },
    {
      decision: 'retry' as const,
      label: copy.resolveReview.retry,
      testID: KalshiPrototypeDevSectionSelectorsIDs.RESOLVE_RETRY,
    },
  ];

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={KalshiPrototypeDevSectionSelectorsIDs.SCREEN}
    >
      <HeaderStandard
        title={copy.title}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView contentContainerStyle={tw.style('pb-6')}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="px-4 pb-2"
        >
          {PROTOTYPE_COPY.picker.description}
        </Text>
        <SectionHeader title={copy.groups.scenarios} />
        {PROTOTYPE_SCENARIO_IDS.map((scenario) => (
          <ActionListItem
            key={scenario}
            label={PROTOTYPE_SCENARIOS[scenario].title}
            description={PROTOTYPE_SCENARIOS[scenario].description}
            onPress={() => startScenario(scenario)}
            pressableProps={{
              testID: `${KalshiPrototypeDevSectionSelectorsIDs.SCENARIO_OPTION}-${scenario}`,
            }}
          />
        ))}
        {isReviewPending ? (
          <>
            <SectionHeader title={copy.groups.resolveReview} />
            {resolveOptions.map((option) => (
              <ActionListItem
                key={option.decision}
                label={option.label}
                onPress={() => resolveKalshiPrototypeDecision(option.decision)}
                pressableProps={{ testID: option.testID }}
              />
            ))}
          </>
        ) : null}
        <SectionHeader title={copy.groups.failures} />
        <ActionListItem
          label={copy.failCodeSendsLabel}
          onPress={() =>
            setKalshiPrototypeCodeSendsFail(!runtime.failCodeSends)
          }
          pressableProps={{
            testID: KalshiPrototypeDevSectionSelectorsIDs.FAIL_CODE_SENDS,
          }}
          endAccessory={
            <Switch
              isOn={runtime.failCodeSends}
              onValueChange={setKalshiPrototypeCodeSendsFail}
            />
          }
        />
        <ActionListItem
          label={copy.failSumsubLaunchLabel}
          onPress={() =>
            setKalshiPrototypeSumsubLaunchFail(!runtime.failSumsubLaunch)
          }
          pressableProps={{
            testID: KalshiPrototypeDevSectionSelectorsIDs.FAIL_SUMSUB_LAUNCH,
          }}
          endAccessory={
            <Switch
              isOn={runtime.failSumsubLaunch}
              onValueChange={setKalshiPrototypeSumsubLaunchFail}
            />
          }
        />
        <Box twClassName="px-4 pt-6">
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default KalshiPrototypeSettings;
