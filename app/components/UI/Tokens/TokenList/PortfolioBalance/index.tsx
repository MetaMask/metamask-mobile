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
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import NonEvmAggregatedPercentage from '../../../../../component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { balanceSelectors } from '@metamask/assets-controllers';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n from '../../../../../../locales/i18n';

export const PortfolioBalance = React.memo(() => {
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const privacyMode = useSelector(selectPrivacyMode);

  const { selectedAccountMultichainBalance } =
    useSelectedAccountMultichainBalances();
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  const { selectBalanceForAllWallets } = balanceSelectors;
  const assetsControllersBalance = useSelector(selectBalanceForAllWallets());

  // Log detailed balance information for all wallets and groups
  // eslint-disable-next-line no-console
  console.log(
    '💰 MetaMask Wallet Balance Details:',
    JSON.stringify(
      {
        totalBalance: assetsControllersBalance?.totalBalanceInUserCurrency,
        currency: assetsControllersBalance?.userCurrency,
        walletCount: assetsControllersBalance?.wallets
          ? Object.keys(assetsControllersBalance.wallets).length
          : 0,
        wallets: assetsControllersBalance?.wallets
          ? Object.entries(assetsControllersBalance.wallets).map(
              ([walletId, wallet]) => ({
                walletId,
                totalBalance: wallet.totalBalanceInUserCurrency,
                currency: wallet.userCurrency,
                groupCount: Object.keys(wallet.groups).length,
                groups: Object.entries(wallet.groups).map(
                  ([groupId, group]) => ({
                    groupId,
                    totalBalance: group.totalBalanceInUserCurrency,
                    currency: group.userCurrency,
                  }),
                ),
              }),
            )
          : [],
      },
      null,
      2,
    ),
  );

  // Format total portfolio balance
  const formattedTotalPortfolioBalance =
    assetsControllersBalance?.totalBalanceInUserCurrency !== undefined
      ? formatWithThreshold(
          assetsControllersBalance.totalBalanceInUserCurrency,
          0,
          I18n.locale,
          {
            style: 'currency',
            currency: assetsControllersBalance.userCurrency.toUpperCase(),
          },
        )
      : undefined;

  // Create display text with total portfolio balance in parentheses
  const getDisplayText = () => {
    const selectedBalance = selectedAccountMultichainBalance?.displayBalance;
    const totalBalance = formattedTotalPortfolioBalance;

    if (!selectedBalance) {
      return undefined;
    }

    // Only show total portfolio balance if it's different from the selected account balance
    // and if we have a valid total balance
    if (totalBalance && totalBalance !== selectedBalance) {
      return `${selectedBalance} (${totalBalance})`;
    }

    return selectedBalance;
  };

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

  const displayText = getDisplayText();

  return (
    <View style={styles.portfolioBalance}>
      <View>
        <View>
          {displayText ? (
            <View style={styles.balanceContainer}>
              <SensitiveText
                isHidden={privacyMode}
                length={SensitiveTextLength.Long}
                testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
                variant={TextVariant.DisplayLG}
              >
                {displayText}
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
