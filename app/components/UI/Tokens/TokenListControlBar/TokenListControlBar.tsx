import React from 'react';
import { ViewStyle } from 'react-native';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import BaseControlBar from '../../shared/BaseControlBar/BaseControlBar';

interface TokenListControlBarProps {
  style?: ViewStyle;
}

export const TokenListControlBar = ({ style }: TokenListControlBarProps) => (
  <BaseControlBar
    networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
    style={style}
  />
);

export default TokenListControlBar;
