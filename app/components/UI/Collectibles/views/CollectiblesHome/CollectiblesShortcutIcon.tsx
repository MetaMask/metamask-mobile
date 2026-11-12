import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../../../../../util/theme';

// Replit's CollectibleCards (external source) and the web design system's Inventory/Storefront.
// These glyphs are not exported by the installed native design system yet.
const INVENTORY =
  'M5 22q-.824 0-1.412-.587C2.999 20.826 3 20.55 3 20V8.725q-.45-.274-.725-.712C2 7.573 2 7.382 2 7V4q0-.824.588-1.413C3.175 1.998 3.45 2 4 2h16q.824 0 1.413.587C22.002 3.174 22 3.45 22 4v3q0 .574-.275 1.012c-.275.438-.425.53-.725.713V20q0 .824-.587 1.413c-.587.589-.863.587-1.413.587zM5 9v11h14V9zM4 7h16V4H4zm5 7h6v-2H9z';
const STOREFRONT =
  'M21 11.05V19q0 .824-.587 1.413A1.93 1.93 0 0 1 19 21H5q-.825 0-1.412-.587A1.93 1.93 0 0 1 3 19v-7.95q-.575-.525-.887-1.35T2.1 7.9l1.05-3.4a2.2 2.2 0 0 1 .713-1.075A1.8 1.8 0 0 1 5.05 3h13.9q.675 0 1.175.413.5.412.725 1.087l1.05 3.4q.3.975-.012 1.775A3.95 3.95 0 0 1 21 11.05M14.2 10q.675 0 1.025-.462.35-.463.275-1.038L14.95 5H13v3.7q0 .525.35.913.35.387.85.387m-4.5 0q.575 0 .938-.387Q11 9.225 11 8.7V5H9.05L8.5 8.5q-.101.6.263 1.05.362.45.937.45m-4.45 0q.45 0 .788-.325c.338-.325.362-.492.412-.825L7 5H5.05l-1 3.35q-.15.5.163 1.075Q4.525 10 5.25 10m13.5 0q.724 0 1.05-.575.325-.575.15-1.075L18.9 5H17l.55 3.85q.075.5.413.825c.338.325.487.325.787.325M5 19h14v-7.05a.6.6 0 0 1-.162.05h-.088a2.9 2.9 0 0 1-1.187-.225q-.513-.225-1.013-.725a3.3 3.3 0 0 1-1.025.7Q14.95 12 14.3 12q-.674 0-1.262-.25a3.3 3.3 0 0 1-1.038-.7q-.425.45-.987.7c-.562.25-.78.25-1.213.25a3.3 3.3 0 0 1-1.312-.25 3.3 3.3 0 0 1-1.038-.7q-.525.525-1.037.738A3 3 0 0 1 5.25 12h-.112A.25.25 0 0 1 5 11.95z';

export default function CollectiblesShortcutIcon({
  section,
}: {
  section: 'packs' | 'cards' | 'market';
}) {
  const { colors } = useTheme();
  const color = colors.icon.alternative;
  return section === 'packs' ? (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      <Path d="M8 5V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2" />
      <Rect x={3} y={6} width={13} height={16} rx={2} />
      <Path d="m9.5 10 3 4-3 4-3-4Z" />
    </Svg>
  ) : (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Path fill={color} d={section === 'cards' ? INVENTORY : STOREFRONT} />
    </Svg>
  );
}
