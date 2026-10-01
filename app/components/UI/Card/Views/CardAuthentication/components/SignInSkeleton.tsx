import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

const SignInSkeleton = () => {
  const tw = useTailwind();
  return (
    <Box
      twClassName="gap-3"
      testID={CardAuthenticationSelectors.RESOLVING_SKELETON}
    >
      <Skeleton height={48} width="100%" style={tw.style('rounded-xl')} />
      <Skeleton height={48} width="100%" style={tw.style('rounded-xl')} />
    </Box>
  );
};

export default SignInSkeleton;
