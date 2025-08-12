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

export const PortfolioBalance = React.memo(() => {
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
  const derivedGroupId = derivedWallet
    ? `${derivedWallet.id}/default`
    : undefined;
  const selectBalanceForDerivedGroup = React.useMemo(
    () =>
      derivedGroupId
        ? balanceSelectors.selectBalanceByAccountGroup(derivedGroupId)
        : null,
    [derivedGroupId],
  );
  const derivedGroupBalance = useSelector((state: RootState) =>
    selectBalanceForDerivedGroup ? selectBalanceForDerivedGroup(state) : null,
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

  const selectedDisplay = React.useMemo(() => {
    if (isMultichainState2Enabled && derivedGroupBalance) {
      const value = derivedGroupBalance.totalBalanceInUserCurrency;
      const currency = derivedGroupBalance.userCurrency;
      return formatWithThreshold(value, 0.01, I18n.locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
      });
    }
    return selectedAccountMultichainBalance?.displayBalance;
  }, [
    isMultichainState2Enabled,
    derivedGroupBalance,
    selectedAccountMultichainBalance?.displayBalance,
  ]);

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
});
