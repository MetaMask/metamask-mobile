import React from 'react';
import type { CaipChainId } from '@metamask/utils';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import BaseControlBar from '../shared/BaseControlBar/BaseControlBar';
import { useLocalNetworkFilterControlBarProps } from '../shared/BaseControlBar';

interface DeFiPositionsControlBarProps {
  /** Local (Redux-free) network filter owned by the DeFi list. `null` means "all popular networks". */
  networkFilter: CaipChainId[] | null;
  /** Updates the local network filter; passed to NetworkMultiSelector instead of a Redux write. */
  onNetworkFilterChange: (chainIds: CaipChainId[] | null) => void;
}

const DeFiPositionsControlBar: React.FC<DeFiPositionsControlBarProps> = ({
  networkFilter,
  onNetworkFilterChange,
}) => {
  const localNetworkFilterProps = useLocalNetworkFilterControlBarProps(
    networkFilter,
    onNetworkFilterChange,
    WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
  );

  return (
    <BaseControlBar
      networkFilterTestId={WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER}
      isDisabled={false}
      customWrapper="none"
      {...localNetworkFilterProps}
    />
  );
};

export default DeFiPositionsControlBar;
