import { useMemo } from 'react';
import { getSession } from './sessionRegistry';
import type { RampSurface } from '../Deposit/types/analytics';

/**
 * Analytics ramp-type/surface props for a NativeFlow screen, in the two shapes
 * the funnel needs (TRAM-3623).
 *
 * The emitted analytics property is always `ramp_surface`; only the internal
 * session param that seeds it is named `rampSurface`.
 */
export interface HeadlessRampProps {
  /**
   * For events whose non-headless `ramp_type` literal is `'UNIFIED_BUY_2'`
   * (most NativeFlow emits). Flips to `'HEADLESS'` plus the seeded surface when
   * a headless session drives the flow.
   */
  headlessRampProps:
    | { ramp_type: 'HEADLESS'; ramp_surface?: RampSurface }
    | { ramp_type: 'UNIFIED_BUY_2' };
  /**
   * For events whose non-headless `ramp_type` literal is `'DEPOSIT'` (e.g.
   * EMAIL_SUBMITTED, OTP_*, BASIC_INFO_ENTERED, ADDRESS_ENTERED, KYC outcomes).
   * Flips to `'HEADLESS'` plus the seeded surface on the headless path.
   */
  headlessDepositRampProps:
    | { ramp_type: 'HEADLESS'; ramp_surface?: RampSurface }
    | { ramp_type: 'DEPOSIT' };
}

/**
 * Shared headless analytics tagging for the NativeFlow screens (TRAM-3623).
 *
 * Every NativeFlow screen used to locally derive these two prop objects from
 * `getSession(headlessSessionId)?.params`. This hook centralizes that so the
 * tagging stays consistent: when a `headlessSessionId` is present the screen's
 * emits are tagged `ramp_type: 'HEADLESS'` plus the seeded `ramp_surface`;
 * otherwise they keep their original UB2 / DEPOSIT literal and no surface, so
 * non-headless traffic is unaffected.
 *
 * @param headlessSessionId - The session id forwarded into the screen via
 * navigation params, or `undefined` for regular (non-headless) UB2 / Deposit
 * traffic.
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

  const headlessDepositRampProps = useMemo<
    HeadlessRampProps['headlessDepositRampProps']
  >(
    () =>
      headlessSessionId
        ? { ramp_type: 'HEADLESS', ramp_surface: headlessSurface }
        : { ramp_type: 'DEPOSIT' },
    [headlessSessionId, headlessSurface],
  );

  return { headlessRampProps, headlessDepositRampProps };
}
