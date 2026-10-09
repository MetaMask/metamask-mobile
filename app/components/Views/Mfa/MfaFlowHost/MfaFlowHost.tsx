import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
 * Full-screen modal that renders the running MFA flow. Leaving it cancels the
 * flow; it closes itself once the flow settles.
 */
const MfaFlowHost = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const active = useActiveMfaFlow();
  const [isClosing, setIsClosing] = useState(false);

  // Follow the running flow until the modal starts closing, then keep showing
  // the last one: a flow started before that reuses this modal, one started
  // after gets its own. Only a settled flow is ever replaced, and a settled
  // flow ignores actions, so this modal never cancels a newer flow.
  const [shown, setShown] = useState(active);
  if (
    !isClosing &&
    active &&
    (active.flow !== shown?.flow || active.state !== shown?.state)
  ) {
    setShown(active);
  }
  const flow = shown?.flow;
  const state = shown?.state;

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        setIsClosing(true);
        flow?.dispatch({ type: 'cancel' });
      }),
    [navigation, flow],
  );

  // Fallback for removals that skip `beforeRemove`.
  useEffect(() => () => flow?.dispatch({ type: 'cancel' }), [flow]);

  const isRunning = active !== undefined;
  useEffect(() => {
    if (!isRunning && !isClosing && navigation.isFocused()) {
      setIsClosing(true);
      navigation.goBack();
    }
  }, [isRunning, isClosing, navigation]);

  if (!flow || !state) {
    return null;
  }

  const { step } = state;
  const shared = {
    key: 'purpose' in step ? `${step.name}-${step.purpose}` : step.name,
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
