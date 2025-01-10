import React from 'react';
import { Path } from 'react-native-svg';
import { useTheme } from '../../../../../../../util/theme';

interface LineProps {
  line: string;
  doesChartHaveData: boolean;
  color?: string;
  testID?: string;
}

const PlotLine = ({
  line,
  doesChartHaveData,
  color,
  // TODO: Determine if this is necessary or not. If it is, break it out into a constants file.
  testID = 'InteractiveChartPlotLine',
}: Partial<LineProps>) => {
  const { colors: themeColors } = useTheme();

  const defaultColor = themeColors.success.default;

  const lineColor = color ?? defaultColor;

  return (
    <Path
      key="line"
      d={line}
      stroke={doesChartHaveData ? lineColor : themeColors.text.alternative}
      strokeWidth={1.75}
      fill="none"
      opacity={doesChartHaveData ? 1 : 0.85}
      testID={testID}
    />
  );
};

export default PlotLine;
