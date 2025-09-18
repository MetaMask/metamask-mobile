import React, { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { useStyles } from '../../../../../component-library/hooks';
import { IconColor } from '../../../../../component-library/components/Icons/Icon';

interface FoxIconProps {
  width?: number;
  height?: number;
  iconColor?: IconColor;
}

const FoxIcon: React.FC<FoxIconProps> = ({
  width = 14,
  height = 14,
  iconColor = IconColor.Alternative,
}) => {
  const { theme } = useStyles(() => ({}), {});

  let fillColor;
  switch (iconColor) {
    case IconColor.Alternative:
      fillColor = theme.colors.icon.alternative;
      break;
    case IconColor.Default:
      fillColor = theme.colors.icon.default;
      break;
    case IconColor.Muted:
      fillColor = theme.colors.icon.muted;
      break;
    case IconColor.Primary:
      fillColor = theme.colors.primary.default;
      break;
    default:
      fillColor = theme.colors.icon.alternative;
  }

  // Memoize SVG XML generation to prevent unnecessary re-creation
  const svgXml = useMemo(
    () => `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 15 14" fill="none">
      <path d="M14.9064 10.2131L13.4564 7.03875L14.9033 4.50795L13.6772 0L8.994 2.88977H6.81998L2.13683 0L0.906372 4.52345L0.993555 4.72681L2.35637 6.74487L0.9107 10.2218L2.13065 13.4835L4.96379 12.27L7.10565 14H8.70833L10.8496 12.27L13.6833 13.4835L14.8316 10.414L14.9064 10.2131Z" fill="${fillColor}"/>
    </svg>
  `,
    [width, height, fillColor],
  );

  return <SvgXml xml={svgXml} width={width} height={height} />;
};

export default FoxIcon;
