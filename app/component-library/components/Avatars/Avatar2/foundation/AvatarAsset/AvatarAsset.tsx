/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import AvatarAssetIcon from './variants/AvatarAssetIcon';
import AvatarAssetImage from './variants/AvatarAssetImage';
import AvatarAssetInitial from './variants/AvatarAssetInitial';
import AvatarAssetJazzIcon from './variants/AvatarAssetJazzIcon';

// Internal dependencies.
import { AvatarAssetProps, AvatarAssetVariants } from './AvatarAsset.types';

const AvatarAsset = (avatarAssetProps: AvatarAssetProps) => {
  switch (avatarAssetProps.variant) {
    case AvatarAssetVariants.Icon:
      return <AvatarAssetIcon {...avatarAssetProps} />;
    case AvatarAssetVariants.Image:
      return <AvatarAssetImage {...avatarAssetProps} />;
    case AvatarAssetVariants.Initial:
      return <AvatarAssetInitial {...avatarAssetProps} />;
    case AvatarAssetVariants.JazzIcon:
      return <AvatarAssetJazzIcon {...avatarAssetProps} />;
    default:
      throw new Error('Invalid Avatar Asset Variant');
  }
};

export default AvatarAsset;
