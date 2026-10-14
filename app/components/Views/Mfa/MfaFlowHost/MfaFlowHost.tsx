import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StackActions,
  useNavigation,
  useNavigationState,
  useRoute,
} from '@react-navigation/native';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { useActiveMfaFlow } from '../../../../util/identity/mfa/engine/useActiveMfaFlow';
import type { MfaFlowState } from '../../../../util/identity/mfa/engine/types';
import { MfaFlowSelectorsIDs } from '../Mfa.testIds';
import IntroStep from './steps/IntroStep';
import PickerStep from './steps/PickerStep';
import EmailEntryStep from './steps/EmailEntryStep';
import CodeStep from './steps/CodeStep';
import PasskeyStep from './steps/PasskeyStep';
import SuccessStep from './steps/SuccessStep';
import FailureStep from './steps/FailureStep';

const getProgressTitle = ({ step, progress }: MfaFlowState) =>
  progress.total > 1 && step.name !== 'success' && step.name !== 'failure'
    ? strings('mfa.progress', progress)
    : undefined;

/**
 * Full-screen modal for MFA flows. While on the stack it shows the running
 * flow and closes itself once none runs; leaving it cancels the flow. Once off
 * the stack it keeps its last step while it animates away, and a new flow
 * opens a new modal.
 */
const MfaFlowHost = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { key } = useRoute();
  const isOnStack = useNavigationState((navState) =>
    navState.routes.some((route) => route.key === key),
  );
  const active = useActiveMfaFlow();
  const isRunning = active !== undefined;

  const [shown, setShown] = useState<typeof active>();
  // Remounts the steps for each flow, so nothing typed carries over.
  const [flowCount, setFlowCount] = useState(0);
  if (isOnStack && active && active.state !== shown?.state) {
    if (active.flow !== shown?.flow) {
      setFlowCount(flowCount + 1);
    }
    setShown(active);
  }
  const flow = shown?.flow;
  const state = shown?.state;

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () =>
        flow?.dispatch({ type: 'cancel' }),
      ),
    [navigation, flow],
  );

  useEffect(() => {
    if (isOnStack && !isRunning) {
      // Removes this modal, even when another screen sits on top of it.
      navigation.dispatch({
        ...StackActions.pop(),
        target: navigation.getState()?.key,
      });
    }
  }, [isOnStack, isRunning, navigation]);

  if (!flow || !state) {
    return null;
  }

  const { step } = state;
  const shared = {
    key: `${flowCount}-${'purpose' in step ? `${step.name}-${step.purpose}` : step.name}`,
    state,
    reason: flow.reason,
    onAction: flow.dispatch,
  };

  const renderStep = () => {
    switch (step.name) {
      case 'intro':
        return <IntroStep {...shared} step={step} />;
      case 'picker':
        return <PickerStep {...shared} step={step} />;
      case 'emailEntry':
        return <EmailEntryStep {...shared} step={step} />;
      case 'otp':
        return <CodeStep {...shared} step={step} />;
      case 'passkey':
        return <PasskeyStep {...shared} step={step} />;
      case 'success':
        return <SuccessStep {...shared} step={step} />;
      case 'failure':
        return <FailureStep {...shared} step={step} />;
      default:
        return (
          <Box twClassName="flex-1 items-center justify-center">
            <ActivityIndicator />
          </Box>
        );
    }
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={`${MfaFlowSelectorsIDs.CONTAINER}-${step.name}`}
    >
      <HeaderStandard
        title={getProgressTitle(state)}
        onClose={() => flow.dispatch({ type: 'cancel' })}
        closeButtonProps={{ testID: MfaFlowSelectorsIDs.CLOSE_BUTTON }}
        includesTopInset
      />
      {renderStep()}
    </SafeAreaView>
  );
};

export default MfaFlowHost;
