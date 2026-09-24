import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../../../../util/theme';

/**
 * Local copies of the `swap-vertical` / `swap-horizontal` glyphs used by the
 * Perps Trade sheet designs.
 *
 * The Perps Figma file draws these with the Material `swap_vert` /
 * `swap_horiz` shapes (two short offset arrows), while MMDS publishes the
 * Phosphor `arrows-down-up` / `arrows-left-right` shapes (two full-length
 * arrows) under `IconName.SwapVertical` / `IconName.SwapHorizontal`. The two
 * sets do not match visually, so the sheet renders the Figma shapes directly.
 *
 * The paths are the unmodified vector exports of the `swap-vertical` and
 * `swap-horizontal` icon instances from the Perps Figma file, placed inside
 * their original 16x16 icon frame. Do not hand-edit; re-export from Figma
 * instead.
 */
const SWAP_VERTICAL_PATH =
  'M2.66667 7.33333V2.55L0.95 4.26667L0 3.33333L3.33333 0L6.66667 3.33333L5.71667 4.26667L4 2.55V7.33333H2.66667ZM7.33333 13.3333L4 10L4.95 9.06667L6.66667 10.7833V6H8V10.7833L9.71667 9.06667L10.6667 10L7.33333 13.3333Z';
const SWAP_VERTICAL_OFFSET = { x: 2.6667, y: 1.3333 };

const SWAP_HORIZONTAL_PATH =
  'M3.33333 10.6667L0 7.33333L3.33333 4L4.26667 4.95L2.55 6.66667H7.33333V8H2.55L4.26667 9.71667L3.33333 10.6667ZM10 6.66667L9.06667 5.71667L10.7833 4H6V2.66667H10.7833L9.06667 0.95L10 0L13.3333 3.33333L10 6.66667Z';
const SWAP_HORIZONTAL_OFFSET = { x: 1.3333, y: 2.6667 };

/** Native frame size of the exported glyphs; matches MMDS `IconSize.Sm`. */
export const PERPS_SWAP_ICON_SIZE_SM = 16;

export interface PerpsSwapIconProps {
  direction: 'vertical' | 'horizontal';
  /** Rendered width/height in px. Defaults to the MMDS `Sm` icon size. */
  size?: number;
  /** Fill colour. Defaults to the theme's default icon colour. */
  color?: string;
  testID?: string;
}

const PerpsSwapIcon: React.FC<PerpsSwapIconProps> = ({
  direction,
  size = PERPS_SWAP_ICON_SIZE_SM,
  color,
  testID = 'perps-swap-icon',
}) => {
  const { colors } = useTheme();
  const fillColor = color ?? colors.icon.default;
  const isVertical = direction === 'vertical';
  const offset = isVertical ? SWAP_VERTICAL_OFFSET : SWAP_HORIZONTAL_OFFSET;

  return (
    <Svg
      testID={testID}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <Path
        d={isVertical ? SWAP_VERTICAL_PATH : SWAP_HORIZONTAL_PATH}
        fill={fillColor}
        transform={`translate(${offset.x} ${offset.y})`}
      />
    </Svg>
  );
};

export default PerpsSwapIcon;
