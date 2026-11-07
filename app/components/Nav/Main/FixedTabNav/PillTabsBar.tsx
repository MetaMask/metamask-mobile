import React from 'react';
import {
  Box,
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';
import BoxGlass from '../../../../component-library/components-temp/BoxGlass';
import CapsuleGlass from '../../../../component-library/components-temp/CapsuleGlass';
import { useLiquidGlass } from '../../../../component-library/hooks/useLiquidGlass';
import { useTheme } from '../../../../util/theme';

/**
 * Selected-pill accent. Matches the nav-exploration spec's `--accent/03/normal`
 * (#BAF24A). Not yet in `@metamask/design-tokens`, so it is a literal here.
 */
// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- New brand accent from the nav exploration; no design token exists yet.
const SELECTED_PILL_BACKGROUND = '#BAF24A';

/**
 * Label on the selected pill. The spec's `--icon/inverse` (#131416): a fixed
 * dark so it stays readable on the green accent in both themes (every text /
 * icon token flips to white in one theme or the other). Equals `text.default`
 * in light mode.
 */
// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- Pairs with the fixed green accent; no token is dark in both themes.
const SELECTED_PILL_TEXT = '#131416';

export interface PillTabItem {
  key: string;
  label: string;
}

interface GlassPillProps {
  label: string;
  pillKey: string;
  testID: string;
  isSelected: boolean;
}

/**
 * A hub pill drawn on Liquid Glass, or on the blurred capsule where the OS
 * has material but not Liquid Glass. The button stays transparent so it does
 * not paint over the material. Elsewhere the pill stays the plain filter.
 */
const GlassPill = ({ label, pillKey, testID, isSelected }: GlassPillProps) => {
  const { colors } = useTheme();
  const { isGlassEnabled, isBlurEnabled } = useLiquidGlass();
  const isMaterial = isGlassEnabled || isBlurEnabled;
  const button = (
    <FilterButton
      value={pillKey}
      testID={testID}
      variant={isMaterial ? FilterButtonVariant.Secondary : undefined}
      twClassName={isMaterial ? 'bg-transparent border-transparent' : undefined}
      textProps={
        isMaterial
          ? {
              // Selected: fixed dark on the green accent (readable in both
              // themes). Unselected: default text, overriding the group's
              // grey alternative to match the spec.
              twClassName: isSelected
                ? `text-[${SELECTED_PILL_TEXT}]`
                : `text-[${colors.text.default}]`,
            }
          : undefined
      }
    >
      {label}
    </FilterButton>
  );

  if (isGlassEnabled) {
    return (
      <BoxGlass
        radiusClassName="rounded-full"
        isInteractive
        tintColor={isSelected ? SELECTED_PILL_BACKGROUND : undefined}
        testID={`${testID}-glass`}
      >
        {button}
      </BoxGlass>
    );
  }

  if (isBlurEnabled) {
    return (
      <CapsuleGlass
        twClassName={`h-8${isSelected ? ` bg-[${SELECTED_PILL_BACKGROUND}]` : ''}`}
        testID={`${testID}-glass`}
      >
        {button}
      </CapsuleGlass>
    );
  }

  return button;
};

export interface PillTabsBarProps {
  testID: string;
  tabs: readonly PillTabItem[];
  selectedKey: string;
  onChange: (key: string) => void;
}

/**
 * Shared pill-tab bar. Renders the hub pill row (MMDS FilterButtonGroup with
 * the Liquid Glass / blur capsule treatment) from a plain controlled list, so
 * any surface — the fixed-tab hubs or Social — gets identical pill styling.
 */
const PillTabsBar = ({
  testID,
  tabs,
  selectedKey,
  onChange,
}: PillTabsBarProps) => (
  <Box twClassName="w-full" testID={`${testID}-pills-chrome`}>
    <FilterButtonGroup
      value={selectedKey}
      onChange={onChange}
      twClassName="px-4 py-4"
      testID={`${testID}-pills`}
    >
      {tabs.map((tab) => (
        <GlassPill
          key={tab.key}
          pillKey={tab.key}
          label={tab.label}
          isSelected={selectedKey === tab.key}
          testID={`${testID}-pill-${tab.key}`}
        />
      ))}
    </FilterButtonGroup>
  </Box>
);

export default PillTabsBar;
