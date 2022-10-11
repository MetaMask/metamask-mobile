/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { AvatarAssetBaseProps } from './AvatarAssetBase.types';

const AvatarAssetBase: React.FC<AvatarAssetBaseProps> = ({
  children,
  ...props
}) => <React.Fragment {...props}>{children}</React.Fragment>;

export default AvatarAssetBase;
