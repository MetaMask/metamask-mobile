import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import createStyles from './AccountGroupBalance.styles';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
} from '../../../../../selectors/assets/balances';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n from '../../../../../../locales/i18n';
import AccountGroupBalanceChange from '../../components/BalanceChange/AccountGroupBalanceChange';

const AccountGroupBalance = () => {
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const privacyMode = useSelector(selectPrivacyMode);
  const groupBalance = useSelector(selectBalanceBySelectedAccountGroup);
  const balanceChange1d = useSelector(
    selectBalanceChangeBySelectedAccountGroup('1d'),
  );

  const togglePrivacy = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const displayBalance = (() => {
    if (!groupBalance) return undefined;
    const value = groupBalance.totalBalanceInUserCurrency;
    const currency = groupBalance.userCurrency;
    return formatWithThreshold(value, 0.01, I18n.locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
  })();

  return (
    <View style={styles.portfolioBalance}>
      <View>
        {displayBalance ? (
          <TouchableOpacity
            onPress={() => togglePrivacy(!privacyMode)}
            testID="balance-container"
          >
            <View style={styles.balanceContainer}>
              <SensitiveText
                isHidden={privacyMode}
                length={SensitiveTextLength.Long}
                testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
                variant={TextVariant.DisplayLG}
              >
                {displayBalance}
              </SensitiveText>
            </View>
            {balanceChange1d && (
              <AccountGroupBalanceChange
                privacyMode={privacyMode}
                amountChangeInUserCurrency={
                  balanceChange1d.amountChangeInUserCurrency
                }
                percentChange={balanceChange1d.percentChange}
                userCurrency={balanceChange1d.userCurrency}
              />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.loaderWrapper}>
            <Loader />
          </View>
        )}
      </View>
    </View>
  );
};

export default AccountGroupBalance;
