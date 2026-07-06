/**
 * useMoonpayReset — hook that drives the MoonPay Reset frame to clear a
 * user's session/authentication tokens stored on MoonPay's domain.
 *
 * Protocol (see https://dev.moonpay.com/platform/frames/reset):
 * 1. Mount the frame at blocks.moonpay.com/platform/v1/reset?channelId=…
 * 2. Frame sends `handshake` → we reply `ack`
 * 3. Frame sends `complete` (success) or `error`
 * 4. We unmount the frame and surface the result.
 */

import { useCallback, useState } from 'react';
import type { MoonpayFrameMessage } from './useMoonpayFrame';

const FRAMES_BASE_URL = 'https://blocks.moonpay.com/platform/v1';
const CHANNEL_RESET = 'ch_reset';

export type ResetState = 'idle' | 'resetting' | 'success' | 'error';

const useMoonpayReset = () => {
  const [resetState, setResetState] = useState<ResetState>('idle');
  const [resetError, setResetError] = useState<string | null>(null);

  const resetFrameUrl =
    resetState === 'resetting'
      ? `${FRAMES_BASE_URL}/reset?channelId=${CHANNEL_RESET}`
      : null;

  const startReset = useCallback(() => {
    setResetError(null);
    setResetState('resetting');
  }, []);

  const dismissReset = useCallback(() => {
    setResetState('idle');
    setResetError(null);
  }, []);

  const handleResetMessage = useCallback((msg: MoonpayFrameMessage) => {
    const payload = msg.message as {
      version?: number;
      kind?: string;
      meta?: { channelId?: string };
      payload?: { code?: string; message?: string };
    };

    if (payload?.kind === 'handshake') {
      msg.reply({
        version: 2,
        meta: { channelId: CHANNEL_RESET },
        kind: 'ack',
      });
      return;
    }

    if (payload?.kind === 'complete') {
      setResetState('success');
      return;
    }

    if (payload?.kind === 'error') {
      setResetError(payload.payload?.message ?? 'Reset failed (unknown error)');
      setResetState('error');
    }
  }, []);

  const handleResetError = useCallback((err: string) => {
    setResetError(err);
    setResetState('error');
  }, []);

  return {
    resetState,
    resetError,
    resetFrameUrl,
    startReset,
    dismissReset,
    handleResetMessage,
    handleResetError,
  };
};

export default useMoonpayReset;
