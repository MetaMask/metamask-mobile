import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import {
  StackActions,
  useNavigation,
  useNavigationState,
  useRoute,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  HeaderStandard,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useActiveMfaFlow } from '../../../../util/identity/mfa/engine/useActiveMfaFlow';
import { MfaFlowSelectorsIDs } from '../Mfa.testIds';
import IntroStep from './steps/IntroStep';
import PickerStep from './steps/PickerStep';
import EmailEntryStep from './steps/EmailEntryStep';
import CodeStep from './steps/CodeStep';
import PasskeyStep from './steps/PasskeyStep';
import SuccessStep from './steps/SuccessStep';
import FailureStep from './steps/FailureStep';

/**
 * Full-screen modal for MFA flows. While on the stack it shows the running
 * flow and closes itself once none runs; leaving it cancels the flow. Once off
 * the stack it keeps its last step while it animates away, and a new flow
 * opens a new modal.
 */
const MfaFlowHost = () => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
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
  const cancel = () => flow.dispatch({ type: 'cancel' });
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

  // The picker is a sheet over the screen that asked for the verification.
  if (step.name === 'picker') {
    return (
      <BottomSheet
        ref={sheetRef}
        onClose={cancel}
        testID={`${MfaFlowSelectorsIDs.CONTAINER}-${step.name}`}
      >
        <BottomSheetHeader
          onClose={() => sheetRef.current?.onCloseBottomSheet()}
          closeButtonProps={{ testID: MfaFlowSelectorsIDs.CLOSE_BUTTON }}
        />
        <PickerStep {...shared} step={step} />
      </BottomSheet>
    );
  }

  // The route is transparent for the picker sheet, so full-screen steps
  // slide in themselves, as a full-screen modal would.
  return (
    <Animated.View
      entering={SlideInDown}
      style={tw.style('flex-1 bg-default')}
      testID={`${MfaFlowSelectorsIDs.CONTAINER}-${step.name}`}
    >
      <HeaderStandard
        onBack={cancel}
        backButtonProps={{ testID: MfaFlowSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      {renderStep()}
    </Animated.View>
  );
};

export default MfaFlowHost;
