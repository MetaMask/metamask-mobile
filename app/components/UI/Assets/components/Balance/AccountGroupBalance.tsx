import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import createStyles from './AccountGroupBalance.styles';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
} from '../../../../../selectors/assets/balances';
import { selectHomepageRedesignV1Enabled } from '../../../../../selectors/featureFlagController/homepage';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useFormatters } from '../../../../hooks/useFormatters';
import AccountGroupBalanceChange from '../../components/BalanceChange/AccountGroupBalanceChange';
import BalanceEmptyState from '../../../BalanceEmptyState';

const AccountGroupBalance = () => {
  const { PreferencesController } = Engine.context;
  const styles = createStyles();
  const { formatCurrency } = useFormatters();
  const privacyMode = useSelector(selectPrivacyMode);
  const groupBalance = useSelector(selectBalanceBySelectedAccountGroup);
  const balanceChange1d = useSelector(
    selectBalanceChangeBySelectedAccountGroup('1d'),
  );
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );

  const togglePrivacy = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const totalBalance = groupBalance?.totalBalanceInUserCurrency ?? 0;
  const userCurrency = groupBalance?.userCurrency ?? '';
  const displayBalance = formatCurrency(totalBalance, userCurrency);

  // Check if balance is zero (empty state) - only check when we have balance data
  const hasZeroBalance =
    groupBalance && groupBalance.totalBalanceInUserCurrency === 0;

  const shouldShowEmptyState = hasZeroBalance && isHomepageRedesignV1Enabled;

  return (
    <View style={styles.accountGroupBalance}>
      <View>
        {!groupBalance ? (
          <View style={styles.skeletonContainer}>
            <Skeleton width={100} height={40} />
            <Skeleton width={100} height={20} />
          </View>
        ) : shouldShowEmptyState ? (
          <BalanceEmptyState testID="account-group-balance-empty-state" />
        ) : (
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
                amountChangeInUserCurrency={
                  balanceChange1d.amountChangeInUserCurrency
                }
                percentChange={balanceChange1d.percentChange}
                userCurrency={balanceChange1d.userCurrency}
              />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default AccountGroupBalance;
