import { useMemo } from 'react';
import { getSession } from './sessionRegistry';
import type { RampSurface } from '../types/depositAnalytics';

/**
 * Analytics ramp-type/surface props for a NativeFlow screen (TRAM-3623 /
 * TRAM-3755).
 *
 * The emitted analytics property is always `ramp_surface`; only the internal
 * session param that seeds it is named `rampSurface`.
 *
 * Non-headless traffic uses `ramp_type: 'UNIFIED_BUY_2'`. Headless sessions
 * flip to `'HEADLESS'` plus the seeded surface.
 *
 * `headlessDepositRampProps` is kept as an alias of `headlessRampProps` for
 * existing Email/OTP/KYC call sites — the former Deposit funnel literal is gone.
 */
export interface HeadlessRampProps {
  headlessRampProps:
    | { ramp_type: 'HEADLESS'; ramp_surface?: RampSurface }
    | { ramp_type: 'UNIFIED_BUY_2' };
  /** Alias of {@link HeadlessRampProps.headlessRampProps} (TRAM-3755). */
  headlessDepositRampProps: HeadlessRampProps['headlessRampProps'];
}

/**
 * Shared headless analytics tagging for NativeFlow screens.
 *
 * @param headlessSessionId - Session id from navigation params, or `undefined`
 * for regular (non-headless) UNIFIED_BUY_2 traffic.
 */
export function useHeadlessRampProps(
  headlessSessionId: string | undefined,
): HeadlessRampProps {
  const headlessSurface = getSession(headlessSessionId)?.params?.rampSurface;

  const headlessRampProps = useMemo<HeadlessRampProps['headlessRampProps']>(
    () =>
      headlessSessionId
        ? { ramp_type: 'HEADLESS', ramp_surface: headlessSurface }
        : { ramp_type: 'UNIFIED_BUY_2' },
    [headlessSessionId, headlessSurface],
  );

  return {
    headlessRampProps,
    headlessDepositRampProps: headlessRampProps,
  };
}
