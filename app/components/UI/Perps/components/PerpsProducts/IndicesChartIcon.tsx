import React, { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';

interface IndicesChartIconProps {
  size?: number;
  color: string;
}

const IndicesChartIcon: React.FC<IndicesChartIconProps> = ({
  size = 24,
  color,
}) => {
  const svgXml = useMemo(
    () => `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
      <path d="M18 17V9"/>
      <path d="M13 17V5"/>
      <path d="M8 17v-3"/>
    </svg>
  `,
    [size, color],
  );

  return <SvgXml xml={svgXml} width={size} height={size} />;
};

export default IndicesChartIcon;
