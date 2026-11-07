import React, { createContext, useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@metamask/design-system-react-native';
import PillTabsBar from './PillTabsBar';
import type { FixedTabPill } from './fixedTabNav.types';

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
      <PillTabsBar
        testID={value.testID}
        tabs={value.pills}
        selectedKey={value.selectedKey}
        onChange={value.onChange}
      />
    </Box>
  );
};

export default FixedTabPillRow;
