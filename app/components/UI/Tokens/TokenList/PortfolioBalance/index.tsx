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
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import AggregatedPercentageCrossChains from '../../../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains';
import { useSelectedAccountMultichainBalances } from '../../../../hooks/useMultichainBalances';
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import NonEvmAggregatedPercentage from '../../../../../component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n from '../../../../../../locales/i18n';
import { usePerpsPortfolioBalance } from '../../../Perps/hooks/usePerpsPortfolioBalance';
import { BigNumber } from 'bignumber.js';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { selectPerpsEnabledFlag } from '../../../Perps/selectors/featureFlags';

export const PortfolioBalance = React.memo(() => {
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const privacyMode = useSelector(selectPrivacyMode);

  const { selectedAccountMultichainBalance } =
    useSelectedAccountMultichainBalances();
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedCurrency = useSelector(selectCurrentCurrency);
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  // Get Perps balance in display currency from persisted state
  // Also fetches initial balance on mount
  const { perpsBalance } = usePerpsPortfolioBalance({ fetchOnMount: true });

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

  const accountMultichainFiatBalance =
    selectedAccountMultichainBalance?.totalFiatBalance || 0;
  const accountMultichainDisplayBalance =
    selectedAccountMultichainBalance?.displayBalance || 0;
  let combinedTotalBalance = accountMultichainFiatBalance;
  // Use the raw accountMultichainBalance balance in fiat to add to the perps balance if enabled
  if (isPerpsEnabled && isEvmSelected) {
    combinedTotalBalance = BigNumber(combinedTotalBalance)
      .plus(perpsBalance)
      .toNumber();
  }

  // Format combined display balance
  const combinedDisplayBalance =
    combinedTotalBalance > 0
      ? formatWithThreshold(combinedTotalBalance, 0, I18n.locale, {
          style: 'currency',
          currency: selectedCurrency,
        })
      : accountMultichainDisplayBalance;

  return (
    <View style={styles.portfolioBalance}>
      <View>
        {accountMultichainDisplayBalance ? (
          <TouchableOpacity
            onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
            testID="balance-container"
          >
            <View style={styles.balanceContainer}>
              <SensitiveText
                isHidden={privacyMode}
                length={SensitiveTextLength.Long}
                testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
                variant={TextVariant.DisplayLG}
              >
                {combinedDisplayBalance}
              </SensitiveText>
            </View>

            {renderAggregatedPercentage()}
          </TouchableOpacity>
        ) : (
          <View style={styles.loaderWrapper}>
            <Loader />
          </View>
        )}
      </View>
    </View>
  );
});
