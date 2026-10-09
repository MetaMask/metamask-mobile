import React, { useEffect, useRef, useState } from 'react';
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
 * Full-screen modal that renders the MFA flow it was opened for. Leaving it
 * cancels that flow; it closes itself once the flow settles.
 */
const MfaFlowHost = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const active = useActiveMfaFlow();
  // A later flow gets its own modal: this one never shows or cancels it, even
  // while it is still animating away.
  const [flow] = useState(() => active?.flow);
  const isRunning = flow !== undefined && active?.flow === flow;
  const isRemoving = useRef(false);

  // Keep the last step on screen while the modal animates away. The flow has
  // settled by then, so it ignores any action.
  const [lastState, setLastState] = useState(active?.state);
  if (isRunning && active.state !== lastState) {
    setLastState(active.state);
  }
  const state = isRunning ? active.state : lastState;

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        isRemoving.current = true;
        flow?.dispatch({ type: 'cancel' });
      }),
    [navigation, flow],
  );

  // Fallback for removals that skip `beforeRemove`.
  useEffect(() => () => flow?.dispatch({ type: 'cancel' }), [flow]);

  useEffect(() => {
    if (!isRunning && !isRemoving.current && navigation.isFocused()) {
      isRemoving.current = true;
      navigation.goBack();
    }
  }, [isRunning, navigation]);

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
