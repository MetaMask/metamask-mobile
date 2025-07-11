import React from 'react';
import { ChainId } from '@metamask/controller-utils';
import TokenIcon from '../Swaps/components/TokenIcon';

interface NetworkAssetLogoProps {
  big: boolean;
  biggest: boolean;
  chainId: string;
  style: object;
  ticker: string;
  testID?: string;
}

function NetworkAssetLogo({
  big,
  biggest,
  chainId,
  style,
  ticker,
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
      style={style}
      symbol={ticker}
      testID={testID}
    />
  );
}

export default NetworkAssetLogo;
