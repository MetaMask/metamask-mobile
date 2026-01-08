import React from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import {
  selectIsPopularNetwork,
  selectChainId,
} from '../../../selectors/networkController';
import { isTestNet } from '../../../util/networks';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import BaseControlBar from '../shared/BaseControlBar/BaseControlBar';

const DeFiPositionsControlBar: React.FC = () => {
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const currentChainId = useSelector(selectChainId) as Hex;

  // Custom disabled logic for DeFi positions
  const isDisabled = isTestNet(currentChainId) || !isPopularNetwork;

  return (
    <BaseControlBar
      networkFilterTestId={WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER}
      isDisabled={isDisabled}
      useEvmSelectionLogic={false}
      customWrapper="none"
    />
  );
};

export default DeFiPositionsControlBar;
