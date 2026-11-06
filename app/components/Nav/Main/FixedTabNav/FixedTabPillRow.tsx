import React, { createContext, useContext, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
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
 * Hub tabs for the screen that is showing, drawn as the Social screen's
 * underline tab bar (`TabsBar`). Renders nothing outside a hub, so product
 * screens keep their layout when opened on their own.
 *
 * The hub still selects by pill `key`; the bar works by index, so the keys
 * map to their position in the pill list and a press resolves back to a key.
 */
const FixedTabPillRow = ({
  topOffset = 0,
  includeTopInset = false,
}: FixedTabPillRowProps) => {
  const value = useContext(FixedTabPillRowContext);
  const insets = useSafeAreaInsets();

  const activeIndex = useMemo(() => {
    if (!value) {
      return -1;
    }
    const index = value.pills.findIndex(
      (pill) => pill.key === value.selectedKey,
    );
    return index === -1 ? 0 : index;
  }, [value]);

  const tabs: TabItem[] = useMemo(
    () =>
      (value?.pills ?? []).map((pill) => ({
        key: pill.key,
        label: pill.label,
        // The bar renders labels only; the screens live in the hub below.
        content: null,
        testID: value ? `${value.testID}-tab-${pill.key}` : undefined,
      })),
    [value],
  );

  if (!value) {
    return null;
  }

  const handleTabPress = (index: number) => {
    const pill = value.pills[index];
    if (pill) {
      value.onChange(pill.key);
    }
  };

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
      <Box twClassName="border-b border-muted" testID={`${value.testID}-pills`}>
        <TabsBar
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={handleTabPress}
          testID={`${value.testID}-tabs`}
        />
      </Box>
    </Box>
  );
};

export default FixedTabPillRow;
