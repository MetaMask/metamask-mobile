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
import {
  SectionDivider,
  Box,
  SectionHeader,
} from '@metamask/design-system-react-native';
import ErrorState from '../../components/ErrorState';
import Routes from '../../../../../constants/navigation/Routes';
import SectionRow from '../../components/SectionRow';
import { useIsZeroBalanceAccount } from './hooks';
import { selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance } from '../../../../../selectors/assets/assets-list';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { selectAccountGroupBalanceForEmptyState } from '../../../../../selectors/assets/balances';
import { TokenListItem } from '../../../../UI/Tokens/TokenList/TokenListItem/TokenListItem';
import RemoveTokenBottomSheet from '../../../../UI/Tokens/TokenList/RemoveTokenBottomSheet';
import { ScamWarningModal } from '../../../../UI/Tokens/TokenList/ScamWarningModal/ScamWarningModal';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import { PopularTokensList } from './components';
import { selectSelectedInternalAccountId } from '../../../../../selectors/accountsController';
import { toHex } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';
import TokenListSkeleton from '../../../../UI/Tokens/TokenList/TokenListSkeleton/TokenListSkeleton';
import { useRemoveToken } from '../../../../UI/Tokens/hooks/useRemoveToken';
import { useRefreshTokens } from '../../../../UI/Tokens/hooks/useRefreshTokens';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { isMusdToken } from '../../../../UI/Earn/constants/musd';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../../UI/Earn/hooks/useMusdConversionEligibility';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import { selectMoneyHubEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';
import { useMoneyTokenListCta } from '../../../../UI/Money/hooks/useMoneyTokenListCta';
import { SCREEN_NAMES } from '../../../../UI/Money/constants/moneyEvents';

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
    const { tokenListItemCta } = useMoneyTokenListCta(SCREEN_NAMES.WALLET_HOME);
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

    const { refresh: refreshTokensForGroup } = useRefreshTokens({
      evmNetworkConfigurationsByChainId: evmNetworkConfigurationsForRefresh,
    });

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
    const isMoneyHubEnabled = useSelector(selectMoneyHubEnabledFlag);
    const { isEligible: isGeoEligible } = useMusdConversionEligibility();
    const shouldExcludeMusd =
      isMoneyHubEnabled && isMusdConversionFlowEnabled && isGeoEligible;

    const title = strings('homepage.sections.tokens');
    // Exclude mUSD while it is surfaced in the Money hub; otherwise include all tokens.
    const displayTokenKeys = useMemo(
      () =>
        sortedTokenKeys
          .filter((key) =>
            shouldExcludeMusd ? !isMusdToken(key.address) : true,
          )
          .slice(0, MAX_TOKENS_DISPLAYED),
      [sortedTokenKeys, shouldExcludeMusd],
    );

    // Show error when an explicit refresh failed, or when balance data has loaded
    // and the account has balance but the selector returned no tokens (controllers
    // failed to load data). The accountGroupBalance null-check prevents a false
    // positive on cold start or for legitimately empty token lists.
    // When mUSD is surfaced in the Money hub, displayTokenKeys can be empty because
    // it is filtered out; do not treat "balance but no non-mUSD tokens" as an error.
    const hasBalanceButNoTokens =
      accountGroupBalance != null &&
      accountGroupBalance.totalBalanceInUserCurrency > 0 &&
      displayTokenKeys.length === 0 &&
      (!shouldExcludeMusd || sortedTokenKeys.length === 0);
    const showTokensError = hasTokensError || hasBalanceButNoTokens;

    const refresh = useCallback(async () => {
      if (isZeroBalanceAccount) {
        await popularTokensListRef.current?.refresh();
      } else {
        try {
          await refreshTokensForGroup();
        } catch {
          setHasTokensError(true);
        }
      }
    }, [isZeroBalanceAccount, refreshTokensForGroup]);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const itemCount = isZeroBalanceAccount ? 0 : displayTokenKeys.length;
    const sectionIsEmpty = isZeroBalanceAccount || showTokensError;

    const { onLayout } = useHomeViewedEvent({
      sectionRef: sectionViewRef,
      isLoading: false,
      sectionName: HomeSectionNames.TOKENS,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: sectionIsEmpty,
      itemCount,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.TOKENS,
      contentReady:
        showTokensError || isZeroBalanceAccount || displayTokenKeys.length > 0,
      isEmpty: isZeroBalanceAccount || showTokensError,
      contentStateForTrace: showTokensError ? 'error' : undefined,
      isLoading:
        displayTokenKeys.length === 0 &&
        sortedTokenKeys.length === 0 &&
        !showTokensError,
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
        <SectionDivider />
        <SectionHeader
          title={title}
          isInteractive
          onPress={handleViewAllTokens}
          testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('tokens')}
        />
        <Box gap={3}>
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
              {displayTokenKeys.length === 0 && sortedTokenKeys.length === 0 ? (
                <TokenListSkeleton count={MAX_TOKENS_DISPLAYED} />
              ) : (
                displayTokenKeys.map((tokenKey, index) => (
                  <TokenListItem
                    key={`${tokenKey.chainId}-${tokenKey.address}-${tokenKey.isStaked ? 'staked' : 'unstaked'}-${index}`}
                    assetKey={tokenKey}
                    showRemoveMenu={showRemoveMenu}
                    setShowScamWarningModal={setShowScamWarningModal}
                    privacyMode={privacyMode}
                    showPercentageChange
                    tokenListItemCta={tokenListItemCta}
                    tokenPositionInList={index + 1}
                    tokensInList={displayTokenKeys.length}
                  />
                ))
              )}
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
