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

  const { selectBalanceForAllWallets } = balanceSelectors;
  const assetsControllersBalance = useSelector(selectBalanceForAllWallets());

  // Try to resolve the correct group id by membership of the selected account
  // TODO(ASSETS-1125): Temporary resolver
  // Until the Account Tree exposes a reliable selector for the currently selected
  // account group id, we resolve `groupId` by:
  // 1) Finding the group in the current wallet that contains the selected account
  // 2) Falling back to the first available group from assets-controllers if needed
  // Long term: replace this with a dedicated "selected account group id" selector
  // from the Account Tree to remove assumptions about membership/order and delete
  // this resolver.
  const groupIdFromMembership = (() => {
    if (!derivedWallet?.groups || !selectedAccount?.id) return undefined;
    const entry = Object.entries(derivedWallet.groups).find(([, group]) =>
      Array.isArray(group?.accounts)
        ? group.accounts.some((a: string) => a === selectedAccount.id)
        : false,
    );
    return entry?.[0];
  })();

  // Gather available group ids from assets-controllers for the wallet
  const availableGroupIds = Object.keys(
    (derivedWallet?.id &&
      assetsControllersBalance?.wallets?.[derivedWallet.id]?.groups) ||
      {},
  );

  const resolvedGroupId =
    groupIdFromMembership && availableGroupIds.includes(groupIdFromMembership)
      ? groupIdFromMembership
      : availableGroupIds[0];

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

  const selectedDisplay = (() => {
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
  })();
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
