import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';
import type { BuybackCelebrationPoint } from './ReplitBuybackCelebration';

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface BuybackCelebrationFlight {
  identity: string;
  source: BuybackCelebrationPoint;
  target: BuybackCelebrationPoint;
}

/** Replit uses centers measured in the containing dialog's logical pixels. */
export function buybackFlightFromBounds(
  source: Bounds,
  target: Bounds,
  root: Bounds,
): Omit<BuybackCelebrationFlight, 'identity'> | undefined {
  if (
    [source, target, root].some(
      (bounds) =>
        !Object.values(bounds).every(Number.isFinite) ||
        bounds.width <= 0 ||
        bounds.height <= 0,
    )
  )
    return undefined;
  return {
    source: {
      x: source.x + source.width / 2 - root.x,
      y: source.y + source.height / 2 - root.y,
    },
    target: {
      x: target.x + target.width / 2 - root.x,
      y: target.y + target.height / 2 - root.y,
    },
  };
}

/** Measures decoration only. The caller completes the real sale before calling complete. */
export function useReplitBuybackFeedback() {
  const rootRef = useRef<View>(null);
  const sourceRef = useRef<View>(null);
  const targetRef = useRef<View>(null);
  const source = useRef<Bounds | undefined>(undefined);
  const generation = useRef(0);
  const mounted = useRef(true);
  const confirmed = useRef(false);
  const started = useRef<number | undefined>(undefined);
  const [flight, setFlight] = useState<BuybackCelebrationFlight>();
  const [walletVisible, setWalletVisible] = useState(false);
  const [previousBalance, setPreviousBalance] = useState<number>();
  const tryStart = useCallback(() => {
    const captured = source.current;
    if (
      !mounted.current ||
      !confirmed.current ||
      !captured ||
      started.current === generation.current
    )
      return;
    const current = generation.current;
    rootRef.current?.measureInWindow((x, y, width, height) => {
      if (!mounted.current || current !== generation.current) return;
      const root = { x, y, width, height };
      targetRef.current?.measureInWindow((tx, ty, tw, th) => {
        if (
          !mounted.current ||
          current !== generation.current ||
          !confirmed.current ||
          started.current === current
        )
          return;
        const points = buybackFlightFromBounds(
          captured,
          { x: tx, y: ty, width: tw, height: th },
          root,
        );
        if (points) {
          started.current = current;
          setFlight({ ...points, identity: `sale-${current}` });
        }
      });
    });
  }, []);
  const startCapture = useCallback(
    (balance: number | undefined) => {
      const current = ++generation.current;
      confirmed.current = false;
      started.current = undefined;
      source.current = undefined;
      setFlight(undefined);
      setPreviousBalance(
        balance !== undefined && Number.isFinite(balance) ? balance : undefined,
      );
      sourceRef.current?.measureInWindow((x, y, width, height) => {
        if (!mounted.current || current !== generation.current) return;
        source.current = { x, y, width, height };
        tryStart();
      });
    },
    [tryStart],
  );
  const complete = useCallback(() => {
    if (!mounted.current) return;
    confirmed.current = true;
    setWalletVisible(true);
    tryStart();
  }, [tryStart]);
  const flightIdentity = flight?.identity;
  const finish = useCallback(() => {
    if (
      !mounted.current ||
      !flightIdentity ||
      flightIdentity !== `sale-${generation.current}`
    )
      return;
    confirmed.current = false;
    setFlight((current) =>
      current?.identity === flightIdentity ? undefined : current,
    );
  }, [flightIdentity]);
  const invalidate = useCallback(() => {
    mounted.current = false;
    ++generation.current;
  }, []);
  useEffect(() => {
    mounted.current = true;
    return invalidate;
  }, [invalidate]);
  return {
    rootRef,
    sourceRef,
    targetRef,
    flight,
    walletVisible,
    previousBalance,
    startCapture,
    complete,
    onTargetLayout: tryStart,
    finish,
  };
}
