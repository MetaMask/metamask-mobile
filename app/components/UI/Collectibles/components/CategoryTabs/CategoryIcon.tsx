/* eslint-disable @metamask/design-tokens/color-no-hex -- These are the approved category illustrations, whose paint colors are artwork rather than UI tokens. */
import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../../../../util/theme';

/** Collection illustrations from the Replit reference, independent of providers. */
const CategoryIcon = ({
  category,
  selected = false,
}: {
  category: string;
  selected?: boolean;
}) => {
  const { colors } = useTheme();
  const name = category.toLowerCase().replace('é', 'e');
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      accessible={false}
    >
      {name.includes('pokemon') ? (
        <G>
          <Circle
            cx={12}
            cy={12}
            r={10}
            fill="#F04444"
            stroke="#17181A"
            strokeWidth={1.5}
          />
          <Path d="M2 12a10 10 0 0 0 20 0Z" fill="#F4F4F4" />
          <Path d="M2 12h20" stroke="#17181A" strokeWidth={2} />
          <Circle
            cx={12}
            cy={12}
            r={3.5}
            fill="#F4F4F4"
            stroke="#17181A"
            strokeWidth={1.5}
          />
          <Circle cx={12} cy={12} r={1.6} fill="#17181A" />
        </G>
      ) : name.includes('one') ? (
        <G transform="rotate(-14 12 12)">
          <Ellipse
            cx={12}
            cy={15.5}
            rx={10.5}
            ry={4.2}
            fill="#DDAA4D"
            stroke="#80532A"
          />
          <Path
            d="M5.8 14.8V11a6.2 6.2 0 0 1 12.4 0v3.8c-3.8 1.8-8.6 1.8-12.4 0Z"
            fill="#F2CF78"
            stroke="#80532A"
          />
          <Path
            d="M6 11.8c3.7 1.5 8.3 1.5 12 0v2.7c-3.7 1.8-8.3 1.8-12 0Z"
            fill="#C7463E"
          />
          <Path
            d="M8 8.5c.5-1.1 1.5-1.8 2.8-2"
            stroke="#FFF0B2"
            strokeWidth={1.3}
            strokeLinecap="round"
          />
        </G>
      ) : name.includes('sport') ? (
        <G>
          <Circle cx={12} cy={12} r={10} fill="#D78A48" stroke="#74452D" />
          <Path
            d="m5 5 14 14M5 19 19 5M2 11c5.5 2 9 5.5 11 11M11 2c2 5.5 5.5 9 11 11"
            stroke="#633D2C"
            strokeWidth={1.2}
          />
          <Path
            d="M5.4 8A7.5 7.5 0 0 1 8 5.4"
            stroke="#F4BD75"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </G>
      ) : name.includes('dragon') ? (
        <G>
          <Circle cx={12} cy={12} r={10} fill="#EBA02E" stroke="#AF6521" />
          <Circle cx={11} cy={10.8} r={8} fill="#FFC357" />
          {[
            [9, 9],
            [15, 9],
            [9, 15],
            [15, 15],
          ].map(([x, y]) => (
            <Path
              key={`${x}-${y}`}
              d="m0-2.4.7 1.6 1.7.1-1.3 1.1.4 1.7L0 1.2l-1.5.9.4-1.7-1.3-1.1 1.7-.1Z"
              transform={`translate(${x} ${y})`}
              fill="#C74827"
            />
          ))}
          <Path
            d="M5.5 8A7.5 7.5 0 0 1 9 5"
            stroke="#FFE9A9"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </G>
      ) : name.includes('watch') ? (
        <G>
          <Rect
            transform="translate(8 1)"
            width={8}
            height={22}
            rx={2}
            fill="#80532A"
          />
          <Rect
            transform="translate(9.5 1)"
            width={5}
            height={22}
            rx={1}
            fill="#B9844C"
          />
          <Path d="M20 10v4" stroke="#80532A" strokeWidth={2} />
          <Circle cx={12} cy={12} r={8} fill="#DDAA4D" stroke="#80532A" />
          <Circle cx={12} cy={12} r={6} fill="#FFF0D1" />
          <Path
            d="M12 8v4l3 2"
            stroke="#633D2C"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ) : name ? (
        <G
          stroke={
            selected ? colors.background.default : colors.icon.alternative
          }
          strokeWidth={1.6}
        >
          <Rect transform="translate(5 3)" width={13} height={17} rx={2} />
          <Path
            d="M8 7h7M8 11h5M3 7v13a2 2 0 0 0 2 2h9"
            strokeLinecap="round"
          />
        </G>
      ) : (
        <G
          stroke={
            selected ? colors.background.default : colors.icon.alternative
          }
          strokeWidth={1.6}
        >
          <Rect transform="translate(4 4)" width={6} height={6} rx={1} />
          <Rect transform="translate(14 4)" width={6} height={6} rx={1} />
          <Rect transform="translate(4 14)" width={6} height={6} rx={1} />
          <Rect transform="translate(14 14)" width={6} height={6} rx={1} />
        </G>
      )}
    </Svg>
  );
};

export default CategoryIcon;
