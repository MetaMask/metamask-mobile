import React from 'react';
import { ChainId } from '@metamask/controller-utils';
import TokenIcon from '../../Base/TokenIcon';

interface NetworkAssetLogoProps {
  big: boolean;
  biggest: boolean;
  chainId: string;
  style: object;
  emptyIconTextStyle?: object;
  ticker: string;
  testID?: string;
}

function NetworkAssetLogo({
  big,
  biggest,
  chainId,
  emptyIconTextStyle,
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
      emptyIconTextStyle={emptyIconTextStyle}
      style={style}
      symbol={ticker}
      testID={testID}
    />
  );
}

export default NetworkAssetLogo;
