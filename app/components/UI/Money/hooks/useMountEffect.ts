import { useEffect, useRef, type EffectCallback } from 'react';

/**
 * Runs `effect` exactly once after the first render. Guards against
 * double-invocation (e.g. React StrictMode / remounts) via a ref.
 */
const useMountEffect = (effect: EffectCallback) => {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useMountEffect;
