/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External depdendencies.
import { useStyles } from '../../../hooks/useStyles';
import BadgeWrapper from '../../../components/Badges/BadgeWrapper';

// Internal dependencies.
import {
  CirclePatternBadgePositions,
  CirclePatternProps,
} from './Circle.types';
import styleSheet from './Circle.styles';
import {
  CIRCLE_PATTERN_TEST_ID,
  DEFAULT_CIRCLE_PATTERN_SIZE,
} from './Circle.constants';

const CirclePattern: React.FC<CirclePatternProps> = ({
  style,
  size = DEFAULT_CIRCLE_PATTERN_SIZE,
  badgeProps,
  badgePosition = CirclePatternBadgePositions.TopRight,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });
  let badgePositions, badgeScale;
  if (badgeProps) {
    badgeScale = 0.5;
    const positionOffset = 0.125;
    /* NOTE: When this component was created, the React Native version was 0.66.3,
     * which does not have transformOrigin. As such, since the badge is being scaled
     * using transform, the position needs to be returned to its original (0,0) position
     * before being placed in the intended offset position.
     */
    const positionReset = Number(size) * -(badgeScale / 2);
    const scaledPositionOffset = Number(size) * -positionOffset;
    const finalPositionOffset = positionReset + scaledPositionOffset;

    switch (badgePosition) {
      case CirclePatternBadgePositions.TopRight:
        badgePositions = {
          top: finalPositionOffset,
          right: finalPositionOffset,
        };
        break;
      case CirclePatternBadgePositions.BottomRight:
        badgePositions = {
          bottom: finalPositionOffset,
          right: finalPositionOffset,
        };
        break;
    }
  }

  const renderCirclePattern = () => (
    <View style={styles.base} testID={CIRCLE_PATTERN_TEST_ID}>
      {children}
    </View>
  );

  return (
    <>
      {badgeProps ? (
        <BadgeWrapper
          badgeProps={badgeProps}
          badgePositions={badgePositions}
          badgeScale={badgeScale}
        >
          {renderCirclePattern()}
        </BadgeWrapper>
      ) : (
        renderCirclePattern()
      )}
    </>
  );
};

export default CirclePattern;
