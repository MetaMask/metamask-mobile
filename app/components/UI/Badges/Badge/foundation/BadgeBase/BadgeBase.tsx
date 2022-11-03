/* eslint-disable react/prop-types */
// Third library dependencies.
import React from 'react';

// External dependencies.
import { default as MorphBadgeBase } from '../../../../../../component-library/components/Badges/Badge/foundation/BadgeBase';
import { useStyles } from '../../../../../hooks/useStyles';

// Internal dependencies
import { BadgeBaseProps } from './BadgeBase.types';
import { BADGE_BASE_TEST_ID } from './BadgeBase.constants';
import styleSheet from './BadgeBase.styles';

const BadgeBase: React.FC<BadgeBaseProps> = ({ style, children, ...props }) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });
  return (
    <MorphBadgeBase testID={BADGE_BASE_TEST_ID} style={styles.base} {...props}>
      {children}
    </MorphBadgeBase>
  );
};
export default BadgeBase;
