import React from 'react';
import { ViewStyle } from 'react-native';
import type { CaipChainId } from '@metamask/utils';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import BaseControlBar from '../../shared/BaseControlBar/BaseControlBar';
import { useLocalNetworkFilterControlBarProps } from '../../shared/BaseControlBar';

interface TokenListControlBarProps {
  goToAddToken: () => void;
  style?: ViewStyle;
  /**
   * When false, only the network filter is shown (e.g. Cash / mUSD-only view).
   * Default true for the main token list.
   */
  showAddToken?: boolean;
  /**
   * When true, hide the sort button (e.g. Cash view where sorting one token type is unnecessary).
   */
  hideSort?: boolean;
  /** Local (Redux-free) network filter owned by the Tokens list. `null` means "all popular networks". */
  networkFilter: CaipChainId[] | null;
  /** Updates the local network filter; passed to NetworkMultiSelector instead of a Redux write. */
  onNetworkFilterChange: (chainIds: CaipChainId[] | null) => void;
}

export const TokenListControlBar = ({
  goToAddToken,
  style,
  showAddToken = true,
  hideSort = false,
  networkFilter,
  onNetworkFilterChange,
}: TokenListControlBarProps) => {
  const additionalButtons = showAddToken ? (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      size={ButtonIconSize.Md}
      onPress={goToAddToken}
      iconName={IconName.Add}
    />
  ) : undefined;

  const localNetworkFilterProps = useLocalNetworkFilterControlBarProps(
    networkFilter,
    onNetworkFilterChange,
    WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
  );

  return (
    <BaseControlBar
      networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
      additionalButtons={additionalButtons}
      customWrapper="outer"
      style={style}
      hideSort={hideSort}
      {...localNetworkFilterProps}
    />
  );
};

export default TokenListControlBar;
