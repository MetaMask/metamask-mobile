import React, { useMemo, useState } from 'react';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Box,
  FilterButton,
  FilterButtonGroup,
} from '@metamask/design-system-react-native';
import type { FixedTabPill } from './fixedTabNav.types';

interface PillHubProps {
  /** Prefix for pill test IDs, for example `fixed-tab-trade`. */
  testID: string;
  pills: readonly FixedTabPill[];
}

/**
 * Content-layer pills. The footer stays mounted in the parent tab navigator.
 * Only the selected destination is mounted.
 *
 * Product screens read the window safe area. This hub already sits below the
 * status bar and above the footer, so children see zero top and bottom insets
 * and do not pad a second time.
 */
const PillHub = ({ testID, pills }: PillHubProps) => {
  const insets = useSafeAreaInsets();
  const [selectedKey, setSelectedKey] = useState(pills[0]?.key ?? '');
  const selected = pills.find((pill) => pill.key === selectedKey) ?? pills[0];
  const ActiveScreen = selected?.Screen;

  const childInsets = useMemo(
    () => ({
      top: 0,
      right: insets.right,
      bottom: 0,
      left: insets.left,
    }),
    [insets.left, insets.right],
  );

  if (!selected || !ActiveScreen) {
    return null;
  }

  return (
    <Box twClassName="flex-1 bg-default" testID={testID}>
      <Box
        twClassName="bg-default"
        style={{ paddingTop: insets.top }}
        testID={`${testID}-pills-chrome`}
      >
        <FilterButtonGroup
          value={selected.key}
          onChange={setSelectedKey}
          twClassName="px-4 py-2"
          testID={`${testID}-pills`}
        >
          {pills.map((pill) => (
            <FilterButton
              key={pill.key}
              value={pill.key}
              testID={`${testID}-pill-${pill.key}`}
            >
              {pill.label}
            </FilterButton>
          ))}
        </FilterButtonGroup>
      </Box>
      <Box key={selected.key} twClassName="flex-1">
        <SafeAreaInsetsContext.Provider value={childInsets}>
          <ActiveScreen />
        </SafeAreaInsetsContext.Provider>
      </Box>
    </Box>
  );
};

export default PillHub;
