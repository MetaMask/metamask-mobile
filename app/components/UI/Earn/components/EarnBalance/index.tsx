import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { earnSelectors } from '../../../../../selectors/earnController';
import StakingBalance from '../../../Stake/components/StakingBalance/StakingBalance';
import { TokenI } from '../../../Tokens/types';
import EarnLendingBalance from '../EarnLendingBalance';

export interface EarnBalanceProps {
  asset: TokenI;
}

// Single entry-point for all Earn asset balances
const EarnBalance = ({ asset }: EarnBalanceProps) => {
  const isLendingToken = useSelector((state: RootState) =>
    earnSelectors.selectEarnToken(state, asset),
  );
  const isReceiptToken = useSelector((state: RootState) =>
    earnSelectors.selectEarnOutputToken(state, asset),
  );

  if (asset?.isETH && !asset.isStaked) {
    return <StakingBalance asset={asset} />;
  }

  if (!asset.chainId) return null;

  if (isLendingToken || isReceiptToken) {
    return <EarnLendingBalance asset={asset} />;
  }

  return null;
};

export default EarnBalance;
