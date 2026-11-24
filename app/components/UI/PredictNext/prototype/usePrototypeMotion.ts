import { useEffect, useMemo, useRef, useState } from 'react';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';

/**
 * Device-capability levers for the prototype's simulated realtime data.
 * Hardware LOW: no looping pulses and a slower tick. Network NONE: the
 * simulated live feed pauses, as a real realtime screen would. Unknown
 * (null) tiers keep the default experience.
 */
export const usePrototypeMotion = () => {
  const hardwareTier = useMemo(() => getHardwareTier(), []);
  const networkTier = useNetworkTier();
  return useMemo(
    () => ({
      shouldAnimate: hardwareTier !== 'LOW',
      tickMs: hardwareTier === 'LOW' ? 3000 : 1000,
      isLivePaused: networkTier === 'NONE',
    }),
    [hardwareTier, networkTier],
  );
};

/** Calls `onTick` every tick while the simulated live feed is running. */
export const useLiveTicker = (onTick: () => void, isEnabled = true) => {
  const { tickMs, isLivePaused } = usePrototypeMotion();
  const callbackRef = useRef(onTick);
  callbackRef.current = onTick;
  useEffect(() => {
    if (!isEnabled || isLivePaused) {
      return undefined;
    }
    const id = setInterval(() => callbackRef.current(), tickMs);
    return () => clearInterval(id);
  }, [isEnabled, isLivePaused, tickMs]);
};

/** A drifting cents price that stays inside 1–99. */
export const useDriftingPrice = (initial: number, isEnabled = true) => {
  const [price, setPrice] = useState(initial);
  useLiveTicker(() => {
    if (Math.random() < 0.6) return;
    setPrice((current) =>
      Math.min(99, Math.max(1, current + (Math.random() < 0.5 ? -1 : 1))),
    );
  }, isEnabled);
  return price;
};
