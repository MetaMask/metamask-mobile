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
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import NonEvmAggregatedPercentage from '../../../../../component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { selectHomepageRedesignV1Enabled } from '../../../../../selectors/featureFlagController/homepage';
import BalanceEmptyState from '../../../BalanceEmptyState';

export const PortfolioBalance = React.memo(() => {
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const privacyMode = useSelector(selectPrivacyMode);

  const { selectedAccountMultichainBalance } =
    useSelectedAccountMultichainBalances();
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );

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

  // Check if balance is zero (empty state) - only check when we have balance data
  const hasZeroBalance =
    selectedAccountMultichainBalance &&
    selectedAccountMultichainBalance.totalFiatBalance === 0;

  const shouldShowEmptyState = hasZeroBalance && isHomepageRedesignV1Enabled;

  return (
    <View style={styles.portfolioBalance}>
      <View>
        {!selectedAccountMultichainBalance?.displayBalance ? (
          <View style={styles.loaderWrapper}>
            <Skeleton width={100} height={40} />
            <Skeleton width={100} height={20} />
          </View>
        ) : shouldShowEmptyState ? (
          <BalanceEmptyState testID="portfolio-balance-empty-state" />
        ) : (
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
                {selectedAccountMultichainBalance?.displayBalance}
              </SensitiveText>
            </View>
            {renderAggregatedPercentage()}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});
