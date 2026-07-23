import { useEffect } from 'react';
import { subscribeCliLoginPushNudge } from '../../../core/AgenticCli/cliLoginPushNudgeSignal';
import { useCliLoginPushNudge } from './useCliLoginPushNudge';

/**
 * Bridges the non-React CLI QR-login service layer to the toast UI (MMAI-925).
 * Mount once inside the ToastContext provider; subscribes to the module-level
 * push-nudge signal and shows the toast when emitted.
 */
const CliLoginPushNudgeListener = () => {
  const { showNudge } = useCliLoginPushNudge();

  useEffect(() => subscribeCliLoginPushNudge(() => showNudge()), [showNudge]);

  return null;
};

export default CliLoginPushNudgeListener;
