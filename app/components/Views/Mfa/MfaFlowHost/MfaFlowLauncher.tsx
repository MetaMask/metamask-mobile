import { useEffect, useRef } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { useActiveMfaFlow } from '../../../../util/identity/mfa/engine/useActiveMfaFlow';
import type { MfaFlow } from '../../../../util/identity/mfa/engine/types';

/**
 * Opens the MFA modal when the running flow has a screen to show. Flows that
 * settle without one (session already valid) never open it, and a modal still
 * on the stack shows the new flow itself. Mounted at the app root, outside
 * any screen, so it keeps reacting wherever the user is.
 */
const MfaFlowLauncher = () => {
  const active = useActiveMfaFlow();
  const flow = active?.flow;
  const hasScreen = active !== undefined && active.state.step.name !== 'idle';
  const openedFor = useRef<MfaFlow | undefined>(undefined);

  useEffect(() => {
    if (!flow || !hasScreen || openedFor.current === flow) {
      return;
    }
    openedFor.current = flow;
    const { navigation } = NavigationService;
    const isModalOpen = navigation
      .getRootState()
      ?.routes.some((route) => route.name === Routes.MFA.FLOW);
    if (!isModalOpen) {
      navigation.navigate(Routes.MFA.FLOW);
    }
  }, [flow, hasScreen]);

  return null;
};

export default MfaFlowLauncher;
