import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

const FoxAnimation = ({
  startFoxAnimation,
  hasFooter,
}: {
  startFoxAnimation: boolean;
  hasFooter: boolean;
}) => {
  const tw = useTailwind();

  return (
    <Box
      testID="fox-animation"
      twClassName="absolute left-0 right-0 items-center justify-center"
      style={tw.style(
        hasFooter ? 'bottom-[100px] h-[150px]' : 'bottom-[-20px] h-[300px]',
        startFoxAnimation ? 'opacity-100' : 'opacity-0',
        'pointer-events-none',
      )}
    />
  );
};

export default FoxAnimation;
