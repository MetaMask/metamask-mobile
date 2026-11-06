import React, { createContext, useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import type { FixedTabPill } from './fixedTabNav.types';

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

interface FixedTabPillRowContextValue {
  testID: string;
  pills: readonly FixedTabPill[];
  selectedKey: string;
  onChange: (key: string) => void;
}

const FixedTabPillRowContext =
  createContext<FixedTabPillRowContextValue | null>(null);

export const FixedTabPillRowProvider = FixedTabPillRowContext.Provider;

interface FixedTabPillPlacement {
  /** True while this screen is mounted inside a fixed-tab hub. */
  active: boolean;
  /** Space above the row so it clears a floating header. */
  rowOffset: number;
  /** Padding the content still needs above itself. */
  contentClearance: number;
}

/**
 * When the row is showing, it sits under a floating header and the content
 * no longer pads for that header. Outside a hub the content keeps its padding.
 */
export const useFixedTabPillPlacement = (
  headerClearance: number,
): FixedTabPillPlacement => {
  const active = useContext(FixedTabPillRowContext) != null;

  return {
    active,
    rowOffset: active ? headerClearance : 0,
    contentClearance: active ? 0 : headerClearance,
  };
};

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

interface FixedTabPillRowProps {
  /** Push the row below a header that floats over the content. */
  topOffset?: number;
  /** Pad for the status bar when no header above the row does. */
  includeTopInset?: boolean;
}

/**
 * Hub pills for the screen that is showing. Renders nothing outside a hub,
 * so product screens keep their layout when opened on their own.
 */
const FixedTabPillRow = ({
  topOffset = 0,
  includeTopInset = false,
}: FixedTabPillRowProps) => {
  const value = useContext(FixedTabPillRowContext);
  const insets = useSafeAreaInsets();

  if (!value) {
    return null;
  }

  const paddingTop = includeTopInset ? insets.top : 0;

  return (
    <Box
      twClassName="w-full"
      style={{
        marginTop: topOffset,
        paddingTop,
      }}
      testID={`${value.testID}-pills-chrome`}
    >
      <FilterButtonGroup
        value={value.selectedKey}
        onChange={value.onChange}
        twClassName="px-4 py-4"
        testID={`${value.testID}-pills`}
      >
        {value.pills.map((pill) => (
          <GlassPill
            key={pill.key}
            pillKey={pill.key}
            label={pill.label}
            isSelected={value.selectedKey === pill.key}
            testID={`${value.testID}-pill-${pill.key}`}
          />
        ))}
      </FilterButtonGroup>
    </Box>
  );
};

export default FixedTabPillRow;
