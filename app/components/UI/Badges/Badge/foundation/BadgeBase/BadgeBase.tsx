/* eslint-disable react/prop-types */
// Third library dependencies.
import React from 'react';

import { default as MorphBadgeBase } from '../../../../../../component-library/components/Badges/Badge/foundation/BadgeBase';

// Internal dependencies
import { BadgeBaseProps } from './BadgeBase.types';

const BadgeBase: React.FC<BadgeBaseProps> = ({ children, ...props }) => (
  <MorphBadgeBase {...props}>{children}</MorphBadgeBase>
);

export default BadgeBase;
