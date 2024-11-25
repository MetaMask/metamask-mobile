import React from 'react';
import { ChainId } from '@metamask/controller-utils';
import TokenIcon from '../Swaps/components/TokenIcon';

interface NetworkAssetLogoProps {
  chainId: string;
  ticker: string;
  style: object;
  big: boolean;
  biggest: boolean;
  testID: string;
}

function NetworkAssetLogo({
  chainId,
  ticker,
  style,
  big,
  biggest,
  testID,
}: NetworkAssetLogoProps) {
  if (chainId === ChainId.mainnet) {
    return (
      <TokenIcon
        big={big}
        biggest={biggest}
        symbol={'ETH'}
        style={style}
        testID={testID}
      />
    );
  }
  return (
    <TokenIcon
      big={big}
      biggest={biggest}
      symbol={ticker}
      style={style}
      testID={testID}
    />
  );
}

export default NetworkAssetLogo;
