/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import AvatarBase from '../AvatarBase/AvatarBase';
import Skeleton from '../../../../Skeleton/Skeleton';
import { SkeletonShape } from '../../../../Skeleton/Skeleton.types';

// Internal dependencies.
import { AvatarSkeletonProps } from './AvatarSkeleton.types';
import { DEFAULT_AVATARBASE_SIZE } from '../AvatarBase/AvatarBase.constants';

const AvatarSkeleton: React.FC<AvatarSkeletonProps> = ({
  size = DEFAULT_AVATARBASE_SIZE,
}) => (
  <AvatarBase size={size}>
    <Skeleton
      width={Number(size)}
      height={Number(size)}
      shape={SkeletonShape.Circle}
    />
  </AvatarBase>
);

export default AvatarSkeleton;
