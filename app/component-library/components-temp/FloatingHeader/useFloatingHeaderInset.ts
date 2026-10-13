import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

/** A `FloatingHeader`'s measured height, to pad content below it; 0 while disabled. */
export const useFloatingHeaderInset = (isEnabled: boolean, topInset = 0) => {
  const tw = useTailwind();
  // Seeded with the header's min height so the first frame already clears it.
  const [height, setHeight] = useState(
    () => topInset + Number(tw.style('h-14').height),
  );
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height),
    [],
  );

  return { inset: isEnabled ? height : 0, onLayout };
};
