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
import { selectAccountGroupBalanceForEmptyState } from '../../../../../selectors/assets/balances';
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
  const [hasTokensError, setHasTokensError] = useState(false);

  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const selectedAccountId = useSelector(selectSelectedInternalAccountId);
  const selectedSolanaAccount =
    useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) || null;
  const isSolanaSelected = selectedSolanaAccount !== null;
  const accountGroupBalance = useSelector(
    selectAccountGroupBalanceForEmptyState,
  );

  const title = strings('homepage.sections.tokens');

  const displayTokenKeys = useMemo(
    () => sortedTokenKeys.slice(0, MAX_TOKENS_DISPLAYED),
    [sortedTokenKeys],
  );

  // Show error when an explicit refresh failed, or when balance data has loaded
  // and the account has balance but the selector returned no tokens (controllers
  // failed to load data). The accountGroupBalance null-check prevents a false
  // positive on cold start before the balance selectors have initialized.
  const showTokensError =
    hasTokensError ||
    (accountGroupBalance !== null &&
      !isZeroBalanceAccount &&
      displayTokenKeys.length === 0);

  const refresh = useCallback(async () => {
    if (isZeroBalanceAccount) {
      await popularTokensListRef.current?.refresh();
    } else {
      try {
        await refreshTokens({
          isSolanaSelected,
          evmNetworkConfigurationsByChainId,
          selectedAccountId,
        });
      } catch {
        setHasTokensError(true);
      }
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

  const handleTokensRetry = useCallback(async () => {
    setHasTokensError(false);
    await refresh();
  }, [refresh]);

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllTokens} />
      {showTokensError ? (
        <ErrorState
          title={strings('homepage.error.unable_to_load', {
            section: title.toLowerCase(),
          })}
          onRetry={handleTokensRetry}
        />
      ) : isZeroBalanceAccount ? (
        <SectionRow>
          <PopularTokensList
            ref={popularTokensListRef}
            onError={setHasTokensError}
          />
        </SectionRow>
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
