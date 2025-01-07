import React, { useMemo } from 'react';
import { Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../../../../../../util/theme';

export interface DataGradientProps {
  dataPoints: number[];
  color?: string;
}

const getGradientOpacityByDataSetSize = (dataSetSize: number) => {
  let opacityTop, opacityBottom;

  if (dataSetSize <= 30) {
    opacityTop = 0.2;
    opacityBottom = 0.2;
  } else {
    opacityTop = 0.4;
    opacityBottom = 0.2;
  }

  return { opacityTop, opacityBottom };
};

const DataGradient = ({ dataPoints, color }: DataGradientProps) => {
  const { colors } = useTheme();

  const defaultColor = colors.success.default;

  // Dynamic gradient based on size of dataset
  const dataSize = dataPoints.length;
  const { opacityTop, opacityBottom } = useMemo(
    () => getGradientOpacityByDataSetSize(dataSize),
    [dataSize],
  );

  return (
    <Defs key="dataGradient">
      <LinearGradient id="dataGradient" x1={0} y1={0} x2={0} y2={'100%'}>
        <Stop stopColor={color ?? defaultColor} stopOpacity={opacityTop} />
        <Stop
          offset={1}
          stopColor={colors.background.default}
          stopOpacity={opacityBottom}
        />
      </LinearGradient>
    </Defs>
  );
};

export default DataGradient;
