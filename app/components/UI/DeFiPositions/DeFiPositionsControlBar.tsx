import React from 'react';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import BaseControlBar from '../shared/BaseControlBar/BaseControlBar';

const DeFiPositionsControlBar: React.FC = () => (
  <BaseControlBar
    networkFilterTestId={WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER}
    isDisabled={false}
    customWrapper="none"
  />
);

export default DeFiPositionsControlBar;
