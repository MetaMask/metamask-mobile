import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
});

interface TokenBalancesLoadMarkerProps {
  /**
   * Key that triggers a reset of the marker's internal state.
   * When this value changes, the marker will reset and wait for a new balance update.
   * Useful for measuring fresh polling cycles when switching between tabs.
   */
  resetKey?: string | number;
}

/**
 * Performance marker component to track when a fresh token balances polling cycle completes.
 * This component tracks when balance data CHANGES (not just exists), indicating a new
 * polling cycle has completed.
 *
 * Use this for performance testing to measure TokenBalancesController polling
 * independently from price fetching.
 */
const TokenBalancesLoadMarker: React.FC<TokenBalancesLoadMarkerProps> = ({
  resetKey,
}) => {
  const contractBalances = useSelector(selectContractBalances);
  const [hasUpdated, setHasUpdated] = useState(false);
  const initialBalancesRef = useRef<string | null>(null);
  const hasSetInitialRef = useRef(false);

  // Reset internal state when resetKey changes
  useEffect(() => {
    if (resetKey !== undefined) {
      setHasUpdated(false);
      initialBalancesRef.current = JSON.stringify(contractBalances);
      hasSetInitialRef.current = true;
    }
  }, [resetKey, contractBalances]);

  useEffect(() => {
    const currentBalancesString = JSON.stringify(contractBalances);

    // First render: capture initial balances (could be stale)
    if (!hasSetInitialRef.current) {
      initialBalancesRef.current = currentBalancesString;
      hasSetInitialRef.current = true;
      return;
    }

    // Detect when balances change from initial state (new polling cycle completed)
    if (
      initialBalancesRef.current !== null &&
      currentBalancesString !== initialBalancesRef.current &&
      Object.keys(contractBalances).length > 0
    ) {
      setHasUpdated(true);
    }
  }, [contractBalances]);

  // Only render the marker when balances have been updated from initial state
  if (!hasUpdated) {
    return null;
  }

  return (
    <View
      testID="token-balances-loaded-marker"
      accessible={false}
      style={styles.hidden}
    />
  );
};

export default TokenBalancesLoadMarker;
