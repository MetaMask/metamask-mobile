/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { AvatarBaseBaseProps } from './AvatarBaseBase.types';

const AvatarBaseBase: React.FC<AvatarBaseBaseProps> = ({ children }) => (
  <>{children}</>
);

export default AvatarBaseBase;
