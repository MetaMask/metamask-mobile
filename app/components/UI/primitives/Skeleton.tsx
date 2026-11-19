import React from 'react';
import {
  Skeleton as DSSkeleton,
  type SkeletonProps,
} from '@metamask/design-system-react-native';

interface Props extends SkeletonProps {
  className?: string;
}

export function Skeleton({ className, ...rest }: Props) {
  return <DSSkeleton {...rest} twClassName={className} />;
}
