import React from 'react';
import { ViewStyle } from 'react-native';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import BaseControlBar from '../../shared/BaseControlBar/BaseControlBar';
import { useStyles } from '../../../hooks/useStyles';
import createControlBarStyles from '../../shared/ControlBarStyles';

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
}

export const TokenListControlBar = ({
  goToAddToken,
  style,
  showAddToken = true,
  hideSort = false,
}: TokenListControlBarProps) => {
  const { styles } = useStyles(createControlBarStyles, undefined);

  const additionalButtons = showAddToken ? (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      size={ButtonIconSize.Lg}
      onPress={goToAddToken}
      iconName={IconName.Add}
      style={styles.controlIconButton}
    />
  ) : undefined;

  return (
    <BaseControlBar
      networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
      additionalButtons={additionalButtons}
      customWrapper="outer"
      style={style}
      hideSort={hideSort}
    />
  );
};

export default TokenListControlBar;
