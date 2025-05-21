import React from 'react';
import { TokenI } from '../../../Tokens/types';
import { USER_HAS_LENDING_POSITIONS } from '../../constants/tempLendingConstants';
import StakingBalance from '../../../Stake/components/StakingBalance/StakingBalance';
import EarnLendingBalance from '../EarnLendingBalance';
import {
  isSupportedLendingReceiptTokenByChainId,
  isSupportedLendingTokenByChainId,
} from '../../utils';

export interface EarnBalanceProps {
  asset: TokenI;
}

// Single entry-point for all Earn asset balances
const EarnBalance = ({ asset }: EarnBalanceProps) => {
  if (asset?.isETH) {
    return <StakingBalance asset={asset} />;
  }

  if (!asset.chainId) return null;

  const isLendingToken = isSupportedLendingTokenByChainId(
    asset.symbol,
    asset.chainId,
  );

  const isReceiptToken = isSupportedLendingReceiptTokenByChainId(
    asset.symbol,
    asset.chainId,
  );

  if ((isLendingToken || isReceiptToken) && USER_HAS_LENDING_POSITIONS) {
    return (
      <EarnLendingBalance asset={asset} displayBalance={!isReceiptToken} />
    );
  }

  return null;
};

export default EarnBalance;
