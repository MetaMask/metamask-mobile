import React, { useCallback, useMemo } from 'react';
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
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import NonEvmAggregatedPercentage from '../../../../../component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { balanceSelectors } from '@metamask/assets-controllers';
import BigNumber from 'bignumber.js';
import useFiatFormatter from '../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { useSelectedAccountMultichainBalances } from '../../../../hooks/useMultichainBalances';
import { selectMultichainAccountsState2Enabled } from '../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';

export const PortfolioBalance = React.memo(() => {
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const privacyMode = useSelector(selectPrivacyMode);

  const selectedGroupBalance = useSelector(
    balanceSelectors.selectBalanceForSelectedAccountGroup(),
  );
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const formatFiat = useFiatFormatter();
  const isMultichainState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const { selectedAccountMultichainBalance } =
    useSelectedAccountMultichainBalances();

  const displayBalance = useMemo(() => {
    if (isMultichainState2Enabled) {
      const value = selectedGroupBalance?.totalBalanceInUserCurrency ?? 0;
      return formatFiat(new BigNumber(value));
    }
    return selectedAccountMultichainBalance?.displayBalance ?? '';
  }, [
    formatFiat,
    isMultichainState2Enabled,
    selectedGroupBalance?.totalBalanceInUserCurrency,
    selectedAccountMultichainBalance?.displayBalance,
  ]);

  const renderAggregatedPercentage = () => {
    if (!isEvmSelected) {
      return <NonEvmAggregatedPercentage privacyMode={privacyMode} />;
    }

    // Preserve existing percentage component rendering only when we have legacy data
    // This will be revisited when percentage calculation is sourced from assets-controllers
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof selectedAccountMultichainBalance === 'undefined') {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return selectedAccountMultichainBalance?.totalFiatBalance ? (
      <AggregatedPercentageCrossChains
        privacyMode={privacyMode}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        totalFiatCrossChains={selectedAccountMultichainBalance.totalFiatBalance}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tokenFiatBalancesCrossChains={
          selectedAccountMultichainBalance.tokenFiatBalancesCrossChains
        }
      />
    ) : null;
  };

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  return (
    <View style={styles.portfolioBalance}>
      <View>
        <View>
          {(isMultichainState2Enabled && !!selectedGroupBalance) ||
          (!isMultichainState2Enabled &&
            !!selectedAccountMultichainBalance?.displayBalance) ? (
            <View style={styles.balanceContainer}>
              <SensitiveText
                isHidden={privacyMode}
                length={SensitiveTextLength.Long}
                testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
                variant={TextVariant.DisplayLG}
              >
                {displayBalance}
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
