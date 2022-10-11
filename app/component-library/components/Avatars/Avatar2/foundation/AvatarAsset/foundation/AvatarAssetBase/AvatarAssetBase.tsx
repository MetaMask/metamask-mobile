// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { AvatarAssetBaseProps } from './AvatarAssetBase.types';

const AvatarAssetBase: React.FC<AvatarAssetBaseProps> = ({ ...props }) => (
  <React.Fragment {...props} />
);

export default AvatarAssetBase;
