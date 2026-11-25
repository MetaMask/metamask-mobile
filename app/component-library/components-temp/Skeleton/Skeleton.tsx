import React from 'react';
import {
  Skeleton as DSRNSkeleton,
  SkeletonProps,
} from '@metamask/design-system-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { hasTestOverrides } from '../../../util/test/utils';

const StaticSkeleton: React.FC<SkeletonProps> = (props) => (
  <DSRNSkeleton autoPlay={false} {...props} />
);

const AnimatedSkeleton: React.FC<SkeletonProps> = (props) => {
  const reduceMotion = useReducedMotion();
  return <DSRNSkeleton autoPlay={!reduceMotion} {...props} />;
};

// Picked once at load, so tests (which never animate) skip the Reanimated hook.
const Skeleton: React.FC<SkeletonProps> =
  hasTestOverrides || process.env.JEST_WORKER_ID
    ? StaticSkeleton
    : AnimatedSkeleton;

export default Skeleton;
