import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import ErrorState from '../../components/ErrorState';
import Routes from '../../../../../constants/navigation/Routes';
import SectionRow from '../../components/SectionRow';
import { useIsZeroBalanceAccount } from './hooks';
import { selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance } from '../../../../../selectors/assets/assets-list';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { selectAccountGroupBalanceForEmptyState } from '../../../../../selectors/assets/balances';
import { TokenListItem } from '../../../../UI/Tokens/TokenList/TokenListItem/TokenListItem';
import { TokenListItemV2 } from '../../../../UI/Tokens/TokenList/TokenListItemV2/TokenListItemV2';
import RemoveTokenBottomSheet from '../../../../UI/Tokens/TokenList/RemoveTokenBottomSheet';
import { ScamWarningModal } from '../../../../UI/Tokens/TokenList/ScamWarningModal/ScamWarningModal';
import { selectTokenListLayoutV2Enabled } from '../../../../../selectors/featureFlagController/tokenListLayout';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import { PopularTokensList } from './components';
import { selectSelectedInternalAccountId } from '../../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { SolScope } from '@metamask/keyring-api';
import { toHex } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';
import { refreshTokens } from '../../../../UI/Tokens/util/refreshTokens';
import { useRemoveToken } from '../../../../UI/Tokens/hooks/useRemoveToken';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useMusdCtaVisibility } from '../../../../UI/Earn/hooks/useMusdCtaVisibility';
import { isMusdToken } from '../../../../UI/Earn/constants/musd';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../../UI/Earn/hooks/useMusdConversionEligibility';

interface TokensSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

const MAX_TOKENS_DISPLAYED = 5;

/**
 * TokensSection - Displays user's token balances on the homepage
 * For zero balance accounts, shows popular tokens with buy buttons
 * For accounts with balance, shows the user's token holdings
 */
const TokensSection = forwardRef<SectionRefreshHandle, TokensSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation();
    const isZeroBalanceAccount = useIsZeroBalanceAccount();
    const { popularNetworks: popularChainIds } = useNetworkEnablement();
    const sortedTokenKeys = useSelector((state: RootState) =>
      selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance(
        state,
        popularChainIds,
      ),
    );
    const accountGroupBalance = useSelector(
      selectAccountGroupBalanceForEmptyState,
    );
    const privacyMode = useSelector(selectPrivacyMode);
    const isTokenListV2 = useSelector(selectTokenListLayoutV2Enabled);
    const ListItemComponent = isTokenListV2 ? TokenListItemV2 : TokenListItem;
    const { shouldShowTokenListItemCta } = useMusdCtaVisibility();
    const popularTokensListRef = useRef<SectionRefreshHandle>(null);
    const [hasTokensError, setHasTokensError] = useState(false);

    const {
      removeTokenState,
      showRemoveMenu,
      removeToken,
      handleClose: handleCloseRemoveTokenBottomSheet,
      showScamWarningModal,
      setShowScamWarningModal,
    } = useRemoveToken();

    const evmNetworkConfigurationsByChainId = useSelector(
      selectEvmNetworkConfigurationsByChainId,
    );

    // Restrict refresh to popular EVM networks so we only poll/refresh those chains.
    const evmNetworkConfigurationsForRefresh = useMemo(() => {
      const allowedEvmChainIds = new Set<string>(
        popularChainIds
          .filter((id) => id.startsWith('eip155:'))
          .map((id) => toHex(id.slice(7)) as Hex),
      );
      return Object.fromEntries(
        Object.entries(evmNetworkConfigurationsByChainId).filter(([chainId]) =>
          allowedEvmChainIds.has(chainId),
        ),
      );
    }, [evmNetworkConfigurationsByChainId, popularChainIds]);
    const selectedAccountId = useSelector(selectSelectedInternalAccountId);
    const selectedSolanaAccount =
      useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) ||
      null;
    const isSolanaSelected = selectedSolanaAccount !== null;

    const prevAccountIdRef = useRef(selectedAccountId);
    // Reset section error when account changes (not on initial mount) so the new account gets a fresh state
    useEffect(() => {
      if (prevAccountIdRef.current !== selectedAccountId) {
        prevAccountIdRef.current = selectedAccountId;
        setHasTokensError(false);
      }
    }, [selectedAccountId]);

    const isMusdConversionFlowEnabled = useSelector(
      selectIsMusdConversionFlowEnabledFlag,
    );
    const { isEligible: isGeoEligible } = useMusdConversionEligibility();
    const isCashSectionEnabled = isMusdConversionFlowEnabled && isGeoEligible;

    const title = strings('homepage.sections.tokens');

    // Only exclude mUSD when Cash section is enabled (then mUSD is shown there). Otherwise include all.
    const displayTokenKeys = useMemo(
      () =>
        sortedTokenKeys
          .filter((key) =>
            isCashSectionEnabled ? !isMusdToken(key.address) : true,
          )
          .slice(0, MAX_TOKENS_DISPLAYED),
      [sortedTokenKeys, isCashSectionEnabled],
    );

    // Show error when an explicit refresh failed, or when balance data has loaded
    // and the account has balance but the selector returned no tokens (controllers
    // failed to load data). The accountGroupBalance null-check prevents a false
    // positive on cold start or for legitimately empty token lists.
    // When Cash section is enabled, displayTokenKeys can be empty because we filter
    // out mUSD (shown in Cash section); do not treat "balance but no non-mUSD tokens"
    // as an error.
    const hasBalanceButNoTokens =
      accountGroupBalance != null &&
      accountGroupBalance.totalBalanceInUserCurrency > 0 &&
      displayTokenKeys.length === 0 &&
      (!isCashSectionEnabled || sortedTokenKeys.length === 0);
    const showTokensError = hasTokensError || hasBalanceButNoTokens;

    const refresh = useCallback(async () => {
      if (isZeroBalanceAccount) {
        await popularTokensListRef.current?.refresh();
      } else {
        try {
          await refreshTokens({
            isSolanaSelected,
            evmNetworkConfigurationsByChainId:
              evmNetworkConfigurationsForRefresh,
            selectedAccountId,
          });
        } catch {
          setHasTokensError(true);
        }
      }
    }, [
      isZeroBalanceAccount,
      isSolanaSelected,
      evmNetworkConfigurationsForRefresh,
      selectedAccountId,
    ]);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const itemCount = isZeroBalanceAccount ? 0 : displayTokenKeys.length;

    const { onLayout } = useHomeViewedEvent({
      sectionRef: sectionViewRef,
      isLoading: false,
      sectionName: HomeSectionNames.TOKENS,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: isZeroBalanceAccount,
      itemCount,
    });

    const handleViewAllTokens = useCallback(() => {
      navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
    }, [navigation]);

    const handleTokensRetry = useCallback(async () => {
      setHasTokensError(false);
      await refresh();
    }, [refresh]);

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box gap={3}>
          <SectionHeader title={title} onPress={handleViewAllTokens} />
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
                <ListItemComponent
                  key={`${tokenKey.chainId}-${tokenKey.address}-${tokenKey.isStaked ? 'staked' : 'unstaked'}-${index}`}
                  assetKey={tokenKey}
                  showRemoveMenu={showRemoveMenu}
                  setShowScamWarningModal={setShowScamWarningModal}
                  privacyMode={privacyMode}
                  showPercentageChange
                  shouldShowTokenListItemCta={shouldShowTokenListItemCta}
                />
              ))}
            </SectionRow>
          )}
        </Box>
        <ScamWarningModal
          showScamWarningModal={showScamWarningModal}
          setShowScamWarningModal={setShowScamWarningModal}
        />
        <RemoveTokenBottomSheet
          isVisible={removeTokenState.isVisible}
          onClose={handleCloseRemoveTokenBottomSheet}
          onRemove={removeToken}
        />
      </View>
    );
  },
);

export default TokensSection;
