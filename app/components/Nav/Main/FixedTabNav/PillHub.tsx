import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { FixedTabPillRowProvider } from './FixedTabPillRow';
import { FixedHubChromeProvider } from './FixedHubChrome';
import type { FixedTabPill } from './fixedTabNav.types';

interface PillHubProps {
  /** Prefix for pill test IDs, for example `fixed-tab-trade`. */
  testID: string;
  pills: readonly FixedTabPill[];
}

/**
 * Content-layer tabs. The footer stays mounted in the parent tab navigator.
 * Only the selected destination is mounted.
 *
 * Each screen renders the tab row under its own header. The hub keeps the
 * real top inset so that header can clear the status bar, and zeros the
 * bottom inset because the footer already covers the home indicator.
 */
const PillHub = ({ testID, pills }: PillHubProps) => {
  const insets = useSafeAreaInsets();
  const firstKey = pills[0]?.key ?? '';
  const [selectedKey, setSelectedKey] = useState(firstKey);
  const selected = pills.find((pill) => pill.key === selectedKey) ?? pills[0];
  const ActiveScreen = selected?.Screen;

  // Returning to the hub (e.g. Home → Trade) lands on the first pill, not the
  // one the user left on. First mount already defaults to the first pill.
  useFocusEffect(
    useCallback(() => {
      setSelectedKey(firstKey);
    }, [firstKey]),
  );

  const childInsets = useMemo(
    () => ({
      top: insets.top,
      right: insets.right,
      bottom: 0,
      left: insets.left,
    }),
    [insets.left, insets.right, insets.top],
  );

  const pillRow = useMemo(
    () => ({
      testID,
      pills,
      selectedKey: selected?.key ?? '',
      onChange: setSelectedKey,
    }),
    [pills, selected?.key, testID],
  );

  if (!selected || !ActiveScreen) {
    return null;
  }

  return (
    <FixedTabPillRowProvider value={pillRow}>
      <Box twClassName="flex-1 bg-default" testID={testID}>
        <FixedHubChromeProvider>
          <Box key={selected.key} twClassName="flex-1">
            <SafeAreaInsetsContext.Provider value={childInsets}>
              <ActiveScreen />
            </SafeAreaInsetsContext.Provider>
          </Box>
        </FixedHubChromeProvider>
      </Box>
    </FixedTabPillRowProvider>
  );
};

export default PillHub;
