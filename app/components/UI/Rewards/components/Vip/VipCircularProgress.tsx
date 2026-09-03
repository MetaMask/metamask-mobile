import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { VIP_GOLD_TEXT_DEFAULT } from './Vip.constants';

export interface VipCircularProgressProps {
  percent: number;
  children?: React.ReactNode;
  testID?: string;
  progressTestID?: string;
  labelTestID?: string;
}

const RADIAL_SIZE = 96;
const STROKE_WIDTH = 8;
const RADIUS = (RADIAL_SIZE - STROKE_WIDTH) / 2;
export const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

const VipCircularProgress: React.FC<VipCircularProgressProps> = ({
  percent,
  children,
  testID,
  progressTestID,
  labelTestID,
}) => {
  const tw = useTailwind();
  const trackColor = tw.color('background-muted') ?? 'transparent';
  const fillColor = VIP_GOLD_TEXT_DEFAULT ?? 'transparent';

  const filledPercent = clampPercent(percent);
  const dashOffset = CIRCUMFERENCE * (1 - filledPercent / 100);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      style={{ width: RADIAL_SIZE, height: RADIAL_SIZE }}
      testID={testID}
    >
      <Svg
        width={RADIAL_SIZE}
        height={RADIAL_SIZE}
        viewBox={`0 0 ${RADIAL_SIZE} ${RADIAL_SIZE}`}
      >
        <Circle
          cx={RADIAL_SIZE / 2}
          cy={RADIAL_SIZE / 2}
          r={RADIUS}
          stroke={trackColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={RADIAL_SIZE / 2}
          cy={RADIAL_SIZE / 2}
          r={RADIUS}
          stroke={fillColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RADIAL_SIZE / 2} ${RADIAL_SIZE / 2})`}
          testID={progressTestID}
        />
      </Svg>
      <Box
        twClassName="absolute"
        alignItems={BoxAlignItems.Center}
        testID={labelTestID}
      >
        {children}
      </Box>
    </Box>
  );
};

export default VipCircularProgress;
