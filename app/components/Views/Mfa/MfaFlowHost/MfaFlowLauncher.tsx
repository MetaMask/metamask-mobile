import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { useActiveMfaFlow } from '../../../../util/identity/mfa/engine/useActiveMfaFlow';
import type { MfaFlow } from '../../../../util/identity/mfa/engine/types';

/**
 * Opens the MFA modal when the running flow has a screen to show. Flows that
 * settle without one (session already valid) never open it.
 */
const MfaFlowLauncher = () => {
  const navigation = useNavigation();
  const active = useActiveMfaFlow();
  const flow = active?.flow;
  const hasScreen = active !== undefined && active.state.step.name !== 'idle';
  const openedFor = useRef<MfaFlow | undefined>(undefined);

  useEffect(() => {
    if (flow && hasScreen && openedFor.current !== flow) {
      openedFor.current = flow;
      navigation.navigate(Routes.MFA.FLOW);
    }
  }, [flow, hasScreen, navigation]);

  return null;
};

export default MfaFlowLauncher;
