import React from 'react';
import {
  Skeleton as DSRNSkeleton,
  SkeletonProps,
} from '@metamask/design-system-react-native';
import { hasTestOverrides } from '../../../util/test/utils';

/**
 * @deprecated Please update your code to use `Skeleton` from `@metamask/design-system-react-native`.
 */
const Skeleton: React.FC<SkeletonProps> = (props) => (
  <DSRNSkeleton
    autoPlay={!hasTestOverrides && !process.env.JEST_WORKER_ID}
    {...props}
  />
);

export default Skeleton;
