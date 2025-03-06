import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Box } from '../Box/Box';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { TokenI } from '../Tokens/types';
import { TokenList } from '../Tokens/TokenList';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import { selectTokenSortConfig } from '../../../selectors/preferencesController';
import { selectTokens } from '../../../selectors/tokensController';
import { sortAssets } from '../Tokens/util';
import { RootState } from '../../../reducers';
import { Hex } from '@metamask/utils';
import { selectChainId } from '../../../selectors/networkController';
import { BridgeToken } from './types';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { formatUnits } from 'ethers/lib/utils';

interface BridgeTokenSelectorProps {
  onTokenSelect: (token: TokenI) => void;
  selectedToken?: TokenI;
  onClose?: () => void;
}

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      padding: 24,
      backgroundColor: theme.colors.background.default,
      flex: 1,
    },
  });
};

export const BridgeTokenSelector: React.FC<BridgeTokenSelectorProps> = ({
  onTokenSelect,
  onClose,
}) => {
  const { styles } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const selectedInternalAccountAddress = useSelector(selectSelectedInternalAccountAddress) as Hex;
  const tokenBalances = useSelector(selectTokensBalances);

  // This returns only current chain tokens unless portfolio view is enabled
  const tokens = useSelector(selectTokens);
  const currentChainId = useSelector(selectChainId) as Hex;

  const tokensList = useMemo(() => {
    // Map tokens with balances and add chainId
    const tokensWithBalances = tokens.map((token) => {
      // Access token balances using the correct path:
      // tokenBalances[accountAddress][chainId][tokenAddress]
      // TODO: does this support Solana?
      const balance = tokenBalances?.[selectedInternalAccountAddress]?.[currentChainId]?.[token.address as Hex];

      return {
        ...token,
        chainId: currentChainId, // Add current chain ID to each token
        balance: formatUnits(balance, token.decimals),
      };
    });

    return sortAssets(tokensWithBalances, tokenSortConfig);
  }, [
    tokens,
    tokenSortConfig,
    tokenBalances,
    selectedInternalAccountAddress,
    currentChainId,
  ]);

  const handleRefresh = useCallback(() => Promise.resolve(), []);

  const handleTokenPress = useCallback((token: TokenI) => {
    const bridgeToken: BridgeToken = {
      address: token.address,
      symbol: token.symbol,
      image: token.image || '',
      decimals: token.decimals,
      chainId: token.chainId as SupportedCaipChainId,
    };

    dispatch({ type: 'bridge/setSourceToken', payload: bridgeToken });
    onTokenSelect(token);
    onClose?.();
  }, [dispatch, onTokenSelect, onClose]);

  return (
    <BottomSheet isFullscreen>
      <Box style={styles.content}>
        <BottomSheetHeader onClose={onClose}>
          <Text variant={TextVariant.HeadingMD}>Select Token</Text>
        </BottomSheetHeader>

        <TokenList
          tokens={tokensList}
          refreshing={false}
          isAddTokenEnabled={false}
          onRefresh={handleRefresh}
          showRemoveMenu={handleTokenPress}
          goToAddToken={() => undefined}
          showPercentageChange={false}
          showNetworkBadge
        />
      </Box>
    </BottomSheet>
  );
};
