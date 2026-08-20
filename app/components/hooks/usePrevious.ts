import { useEffect, useRef } from 'react';

export default function usePrevious<T>(state: T): T | undefined {
  // Opted out of the React Compiler. This hook intentionally reads `ref.current`
  // during render to return the value from the *previous render* — the compiler
  // disallows ref access during render, and the state-based alternative has
  // different ("previous distinct value") semantics that break callers relying
  // on the previous-render value. It's a trivial passthrough with no
  // optimization upside, so skipping compilation here is safe.
  'use no memo';
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = state;
  });

  return ref.current;
}
