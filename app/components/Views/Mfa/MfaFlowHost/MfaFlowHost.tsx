import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { useActiveMfaFlow } from '../../../../util/identity/mfa/engine/useActiveMfaFlow';
import { useParams } from '../../../../util/navigation/navUtils';
import type { MfaFlowState } from '../../../../util/identity/mfa/engine/types';
import { MfaFlowSelectorsIDs } from '../Mfa.testIds';
import IntroStep from './steps/IntroStep';
import PickerStep from './steps/PickerStep';
import EmailEntryStep from './steps/EmailEntryStep';
import CodeStep from './steps/CodeStep';
import PasskeyStep from './steps/PasskeyStep';
import SuccessStep from './steps/SuccessStep';
import FailureStep from './steps/FailureStep';
import { getMfaFlowId } from './flowId';

const getProgressTitle = ({ step, progress }: MfaFlowState) =>
  progress.total > 1 && step.name !== 'success' && step.name !== 'failure'
    ? strings('mfa.progress', progress)
    : undefined;

/**
 * Full-screen modal for one MFA flow, the one whose id is in its route params:
 * each flow opens its own modal (see `MfaFlowLauncher`). Leaving it cancels
 * that flow; it closes itself once the flow settles.
 */
const MfaFlowHost = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { flowId } = useParams<{ flowId: string }>();
  const active = useActiveMfaFlow();
  const own =
    active && getMfaFlowId(active.flow) === flowId ? active : undefined;
  const [isClosing, setIsClosing] = useState(false);

  // Keep the last step on screen while the modal animates away. The flow has
  // settled by then, so it ignores any action.
  const [shown, setShown] = useState(own);
  if (own && own.state !== shown?.state) {
    setShown(own);
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

  // Fallback for removals that skip `beforeRemove`. Nothing to update on
  // unmount: only the flow needs cancelling.
  useEffect(() => () => flow?.dispatch({ type: 'cancel' }), [flow]);

  // `goBack` removes this modal even when a newer one is on top of it.
  const isRunning = own !== undefined;
  useEffect(() => {
    if (!isRunning && !isClosing) {
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
