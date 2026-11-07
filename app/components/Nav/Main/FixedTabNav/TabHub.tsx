import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { FixedTabRowProvider } from './FixedTabRow';
import { FixedHubChromeProvider } from './FixedHubChrome';
import type { FixedHubTab } from './fixedTabNav.types';

interface TabHubProps {
  /** Prefix for tab test IDs, for example `fixed-tab-trade`. */
  testID: string;
  tabs: readonly FixedHubTab[];
}

/**
 * Content-layer tabs. The footer stays mounted in the parent tab navigator.
 * Only the selected destination is mounted.
 *
 * Each screen renders the tab row under its own header. The hub keeps the
 * real top inset so that header can clear the status bar, and zeros the
 * bottom inset because the footer already covers the home indicator.
 */
const TabHub = ({ testID, tabs }: TabHubProps) => {
  const insets = useSafeAreaInsets();
  const firstKey = tabs[0]?.key ?? '';
  const [selectedKey, setSelectedKey] = useState(firstKey);
  const selected = tabs.find((tab) => tab.key === selectedKey) ?? tabs[0];
  const ActiveScreen = selected?.Screen;

  // Returning to the hub (e.g. Home → Trade) lands on the first tab, not the
  // one the user left on. First mount already defaults to the first tab.
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

  const tabRow = useMemo(
    () => ({
      testID,
      tabs,
      selectedKey: selected?.key ?? '',
      onChange: setSelectedKey,
    }),
    [tabs, selected?.key, testID],
  );

  if (!selected || !ActiveScreen) {
    return null;
  }

  return (
    <FixedTabRowProvider value={tabRow}>
      <Box twClassName="flex-1 bg-default" testID={testID}>
        <FixedHubChromeProvider>
          <Box key={selected.key} twClassName="flex-1">
            <SafeAreaInsetsContext.Provider value={childInsets}>
              <ActiveScreen />
            </SafeAreaInsetsContext.Provider>
          </Box>
        </FixedHubChromeProvider>
      </Box>
    </FixedTabRowProvider>
  );
};

export default TabHub;
