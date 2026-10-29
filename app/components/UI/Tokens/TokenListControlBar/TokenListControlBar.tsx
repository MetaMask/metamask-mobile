import React from 'react';
import { ViewStyle } from 'react-native';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import BaseControlBar from '../../shared/BaseControlBar/BaseControlBar';

interface TokenListControlBarProps {
  style?: ViewStyle;
  /**
   * When true, hide the sort button (e.g. Cash view where sorting one token type is unnecessary).
   */
  hideSort?: boolean;
}

export const TokenListControlBar = ({
  style,
  hideSort = false,
}: TokenListControlBarProps) => (
  <BaseControlBar
    networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
    customWrapper="outer"
    style={style}
    hideSort={hideSort}
  />
);

export default TokenListControlBar;
