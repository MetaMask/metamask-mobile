/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import AvatarAssetInitial from './variants/AvatarAssetInitial';

// Internal dependencies.
import { AvatarAssetProps, AvatarAssetVariants } from './AvatarAsset.types';

const AvatarAsset = (avatarAssetProps: AvatarAssetProps) => {
  switch (avatarAssetProps.variant) {
    case AvatarAssetVariants.Initial:
      return <AvatarAssetInitial {...avatarAssetProps} />;
    default:
      throw new Error('Invalid Avatar Asset Variant');
  }
};

export default AvatarAsset;
