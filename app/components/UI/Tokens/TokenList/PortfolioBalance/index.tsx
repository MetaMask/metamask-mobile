import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../../util/theme';
import Engine from '../../../../../core/Engine';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import createStyles from '../../styles';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { EYE_SLASH_ICON_TEST_ID, EYE_ICON_TEST_ID } from './index.constants';
import AggregatedPercentageCrossChains from '../../../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains';
import { useSelectedAccountMultichainBalances } from '../../../../hooks/useMultichainBalances';
import { balanceSelectors } from '@metamask/assets-controllers';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n from '../../../../../../locales/i18n';
import { selectMultichainAccountsState2Enabled } from '../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import type { RootState } from '../../../../../reducers';
import { selectWalletByAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import NonEvmAggregatedPercentage from '../../../../../component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';

export const PortfolioBalance = () => {
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const privacyMode = useSelector(selectPrivacyMode);

  const { selectedAccountMultichainBalance } =
    useSelectedAccountMultichainBalances();
  const isMultichainState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const derivedWallet = useSelector((state: RootState) =>
    selectWalletByAccount(state)(selectedAccount?.id as string),
  );
  // TODO(ASSETS-1125): Temporary workaround for testing only.
  // We currently derive the account group id as `${walletId}/default` by first
  // selecting the currently selected internal account, then selecting the wallet
  // that contains that account, and finally appending `/default` to form a group id.
  // This is NOT the intended long-term approach. Once the Account Tree exposes a
  // reliable "selected account group id" (or a selector for the current selected
  // account group), replace this derivation with that selector and remove this logic.
  // Using the proper selector ensures we always read the exact group the user has
  // selected and avoids assumptions about group naming (e.g., `/default`).
  // Legacy placeholder, no longer used after membership-based resolution
  // const derivedGroupId = derivedWallet ? `${derivedWallet.id}/default` : undefined;
  // Selector for derivedGroupId kept for reference; resolvedGroupId is used instead
  // const selectBalanceForDerivedGroup = React.useMemo(
  //   () =>
  //     derivedGroupId
  //       ? balanceSelectors.selectBalanceByAccountGroup(derivedGroupId)
  //       : null,
  //   [derivedGroupId],
  // );
  // Kept for potential future comparison; currently unused after resolvedGroupId path
  // const derivedGroupBalance = useSelector((state: RootState) =>
  //   selectBalanceForDerivedGroup ? selectBalanceForDerivedGroup(state) : null,
  // );

  // Read full wallets/groups to detect when aggregated data is hydrated
  const { selectBalanceForAllWallets } = balanceSelectors;
  const assetsControllersBalance = useSelector(selectBalanceForAllWallets());

  // Try to resolve the correct group id by membership of the selected account
  const groupIdFromMembership = React.useMemo(() => {
    if (!derivedWallet?.groups || !selectedAccount?.id) return undefined;
    const entry = Object.entries(derivedWallet.groups).find(([, group]) =>
      Array.isArray(group?.accounts)
        ? group.accounts.some((a: string) => a === selectedAccount.id)
        : false,
    );
    return entry?.[0];
  }, [derivedWallet?.groups, selectedAccount?.id]);

  // Gather available group ids from assets-controllers for the wallet
  const availableGroupIds = React.useMemo(
    () =>
      Object.keys(
        (derivedWallet?.id &&
          assetsControllersBalance?.wallets?.[derivedWallet.id]?.groups) ||
          {},
      ),
    [assetsControllersBalance?.wallets, derivedWallet?.id],
  );

  // Resolve final group id to use for aggregated balance
  const resolvedGroupId = React.useMemo(() => {
    if (
      groupIdFromMembership &&
      availableGroupIds.includes(groupIdFromMembership)
    ) {
      return groupIdFromMembership;
    }
    return availableGroupIds[0];
  }, [availableGroupIds, groupIdFromMembership]);

  const hasAggregatedGroup = Boolean(
    derivedWallet?.id &&
      resolvedGroupId &&
      assetsControllersBalance?.wallets?.[derivedWallet.id]?.groups?.[
        resolvedGroupId
      ],
  );

  const selectBalanceForResolvedGroup = React.useMemo(
    () =>
      resolvedGroupId
        ? balanceSelectors.selectBalanceByAccountGroup(resolvedGroupId)
        : null,
    [resolvedGroupId],
  );
  const resolvedGroupBalance = useSelector((state: RootState) =>
    selectBalanceForResolvedGroup ? selectBalanceForResolvedGroup(state) : null,
  );

  // No dev logs in production build
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  const renderAggregatedPercentage = () => {
    if (
      !selectedAccountMultichainBalance ||
      !selectedAccountMultichainBalance?.shouldShowAggregatedPercentage ||
      selectedAccountMultichainBalance?.totalFiatBalance === undefined
    ) {
      return null;
    }

    if (!isEvmSelected) {
      return <NonEvmAggregatedPercentage privacyMode={privacyMode} />;
    }

    return (
      <AggregatedPercentageCrossChains
        privacyMode={privacyMode}
        totalFiatCrossChains={selectedAccountMultichainBalance.totalFiatBalance}
        tokenFiatBalancesCrossChains={
          selectedAccountMultichainBalance.tokenFiatBalancesCrossChains
        }
      />
    );
  };

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const selectedDisplay = React.useMemo(() => {
    if (
      isMultichainState2Enabled &&
      hasAggregatedGroup &&
      resolvedGroupBalance
    ) {
      const value = resolvedGroupBalance.totalBalanceInUserCurrency;
      const currency = resolvedGroupBalance.userCurrency;
      return formatWithThreshold(value, 0.01, I18n.locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
      });
    }
    return selectedAccountMultichainBalance?.displayBalance;
  }, [
    isMultichainState2Enabled,
    hasAggregatedGroup,
    resolvedGroupBalance,
    selectedAccountMultichainBalance?.displayBalance,
  ]);

  // No dev logs in production build

  return (
    <View style={styles.portfolioBalance}>
      <View>
        <View>
          {selectedDisplay ? (
            <View style={styles.balanceContainer}>
              <SensitiveText
                isHidden={privacyMode}
                length={SensitiveTextLength.Long}
                testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
                variant={TextVariant.DisplayLG}
              >
                {selectedDisplay}
              </SensitiveText>
              <TouchableOpacity
                onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
                testID="balance-container"
              >
                <Icon
                  style={styles.privacyIcon}
                  name={privacyMode ? IconName.EyeSlash : IconName.Eye}
                  size={IconSize.Md}
                  color={IconColor.Default}
                  testID={
                    privacyMode ? EYE_SLASH_ICON_TEST_ID : EYE_ICON_TEST_ID
                  }
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loaderWrapper}>
              <Loader />
            </View>
          )}

          {renderAggregatedPercentage()}
        </View>
      </View>
    </View>
  );
};
