import React from 'react';
import {
  Skeleton as DSSkeleton,
  type SkeletonProps as DSSkeletonProps,
} from '@metamask/design-system-react-native';

// The design system only takes twClassName for now; this maps className to it.
interface Props extends DSSkeletonProps {
  className?: string;
}

export function Skeleton({ className, ...rest }: Props) {
  return <DSSkeleton {...rest} twClassName={className} />;
}
