import React from 'react';
import {
  Skeleton as DSRNSkeleton,
  SkeletonProps,
} from '@metamask/design-system-react-native';
import { isE2E } from '../../../util/test/utils';

const Skeleton: React.FC<SkeletonProps> = (props) => (
  <DSRNSkeleton autoPlay={!isE2E && !process.env.JEST_WORKER_ID} {...props} />
);

export default Skeleton;
