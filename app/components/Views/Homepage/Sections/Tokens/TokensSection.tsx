import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import ErrorState from '../../components/ErrorState';
import Routes from '../../../../../constants/navigation/Routes';
import SectionRow from '../../components/SectionRow';
import { useIsZeroBalanceAccount } from './hooks';
import { selectSortedAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { TokenListItem } from '../../../../UI/Tokens/TokenList/TokenListItem/TokenListItem';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import { PopularTokensList } from './components';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectSelectedInternalAccountId } from '../../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { SolScope } from '@metamask/keyring-api';
import { refreshTokens } from '../../../../UI/Tokens/util/refreshTokens';

const MAX_TOKENS_DISPLAYED = 5;

// No-op functions for TokenListItem props we don't need in the homepage section
const noopShowRemoveMenu = () => undefined;
const noopSetShowScamWarningModal = () => undefined;

/**
 * TokensSection - Displays user's token balances on the homepage
 * For zero balance accounts, shows popular tokens with buy buttons
 * For accounts with balance, shows the user's token holdings
 */
const TokensSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const isZeroBalanceAccount = useIsZeroBalanceAccount();
  const sortedTokenKeys = useSelector(selectSortedAssetsBySelectedAccountGroup);
  const privacyMode = useSelector(selectPrivacyMode);
  const popularTokensListRef = useRef<SectionRefreshHandle>(null);
  const [hasPopularTokensError, setHasPopularTokensError] = useState(false);

  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const selectedAccountId = useSelector(selectSelectedInternalAccountId);
  const selectedSolanaAccount =
    useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) || null;
  const isSolanaSelected = selectedSolanaAccount !== null;

  const title = strings('homepage.sections.tokens');

  const displayTokenKeys = useMemo(
    () => sortedTokenKeys.slice(0, MAX_TOKENS_DISPLAYED),
    [sortedTokenKeys],
  );

  const refresh = useCallback(async () => {
    if (isZeroBalanceAccount) {
      await popularTokensListRef.current?.refresh();
    } else {
      await refreshTokens({
        isSolanaSelected,
        evmNetworkConfigurationsByChainId,
        selectedAccountId,
      });
    }
  }, [
    isZeroBalanceAccount,
    isSolanaSelected,
    evmNetworkConfigurationsByChainId,
    selectedAccountId,
  ]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllTokens = useCallback(() => {
    navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
  }, [navigation]);

  const handlePopularTokensRetry = useCallback(() => {
    setHasPopularTokensError(false);
  }, []);

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllTokens} />
      {isZeroBalanceAccount ? (
        hasPopularTokensError ? (
          <ErrorState
            title={strings('homepage.error.unable_to_load', {
              section: title.toLowerCase(),
            })}
            onRetry={handlePopularTokensRetry}
          />
        ) : (
          <SectionRow>
            <PopularTokensList
              ref={popularTokensListRef}
              onError={setHasPopularTokensError}
            />
          </SectionRow>
        )
      ) : (
        <SectionRow>
          {displayTokenKeys.map((tokenKey, index) => (
            <TokenListItem
              key={`${tokenKey.chainId}-${tokenKey.address}-${tokenKey.isStaked ? 'staked' : 'unstaked'}-${index}`}
              assetKey={tokenKey}
              showRemoveMenu={noopShowRemoveMenu}
              setShowScamWarningModal={noopSetShowScamWarningModal}
              privacyMode={privacyMode}
              showPercentageChange
            />
          ))}
        </SectionRow>
      )}
    </Box>
  );
});

export default TokensSection;
