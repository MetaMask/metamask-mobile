/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import AvatarToken from '../../Avatars/Avatar/variants/AvatarToken/AvatarToken';

// Internal dependencies.
import { TokenIconProps } from './TokenIcon.types';

const TokenIcon: React.FC<TokenIconProps> = ({ ...props }) => (
  <AvatarToken {...props} />
);

export default TokenIcon;
