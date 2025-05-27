import React from 'react';
import { TokenI } from '../../../Tokens/types';
import { USER_HAS_LENDING_POSITIONS } from '../../constants/tempLendingConstants';
import StakingBalance from '../../../Stake/components/StakingBalance/StakingBalance';
import EarnLendingBalance from '../EarnLendingBalance';
import useEarnTokens from '../../hooks/useEarnTokens';

export interface EarnBalanceProps {
  asset: TokenI;
}

// Single entry-point for all Earn asset balances
const EarnBalance = ({ asset }: EarnBalanceProps) => {
  const { getEarnToken, getOutputToken } = useEarnTokens();

  if (asset?.isETH) {
    return <StakingBalance asset={asset} />;
  }

  if (!asset.chainId) return null;

  const isLendingToken = getEarnToken(asset);
  const isReceiptToken = getOutputToken(asset);

  if ((isLendingToken || isReceiptToken) && USER_HAS_LENDING_POSITIONS) {
    return (
      <EarnLendingBalance asset={asset} displayBalance={!isReceiptToken} />
    );
  }

  return null;
};

export default EarnBalance;
