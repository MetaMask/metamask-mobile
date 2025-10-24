import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../util/theme';
import { TokenI } from '../types';
import { TokenListItem } from './TokenListItem';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import createStyles from '../styles';

interface TokenListViewProps {
  tokenKeys: TokenI[];
  showRemoveMenu: (token: TokenI) => void;
  setShowScamWarningModal: () => void;
}

const TokenListView = ({
  tokenKeys,
  showRemoveMenu,
  setShowScamWarningModal,
}: TokenListViewProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const renderTokenListItem = useCallback(
    (token: TokenI, index: number) => {
      const assetKey = {
        address: token.address,
        chainId: token.chainId,
        isStaked: token.isStaked,
      };

      return (
        <TokenListItem
          key={`${token.address}-${token.chainId}-${
            token.isStaked ? 'staked' : 'unstaked'
          }-${index}`}
          assetKey={assetKey}
          showRemoveMenu={showRemoveMenu}
          setShowScamWarningModal={setShowScamWarningModal}
          privacyMode={false}
          showPercentageChange
        />
      );
    },
    [showRemoveMenu, setShowScamWarningModal],
  );

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
    >
      <View style={styles.wrapper}>
        {tokenKeys.map((token, index) => renderTokenListItem(token, index))}
      </View>
    </View>
  );
};

export default TokenListView;
