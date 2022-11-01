/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import AvatarBase from '../../../../../../../../component-library/components/Avatars/Avatar/foundation/AvatarBase';

// Internal dependencies.
import { AvatarBaseBaseProps } from './AvatarBaseBase.types';

const AvatarBaseBase: React.FC<AvatarBaseBaseProps> = ({
  children,
  ...props
}) => <AvatarBase {...props}>{children}</AvatarBase>;

export default AvatarBaseBase;
