import React, { PureComponent } from 'react';
import Identicon from '../../Identicon';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { renderFromWei } from '../../../../util/number';
import { getTicker } from '../../../../util/transactions';
import { isDefaultAccountName } from '../../../../util/ENSUtils';
import { strings } from '../../../../../locales/i18n';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { connect } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../../util/theme';

const EMPTY = '0x0';
const BALANCE_KEY = 'balance';

const createStyles = (colors) =>
  StyleSheet.create({
    account: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 20,
      height: 80,
    },
    disabledAccount: {
      opacity: 0.5,
    },
    accountInfo: {
      marginLeft: 15,
      marginRight: 0,
      flex: 1,
      flexDirection: 'row',
    },
    accountLabel: {
      fontSize: 18,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    accountBalanceWrapper: {
      display: 'flex',
      flexDirection: 'row',
    },
    accountBalance: {
      paddingTop: 5,
      fontSize: 12,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    accountBalanceError: {
      color: colors.error.default,
      marginLeft: 4,
    },
    importedView: {
      flex: 0.5,
      alignItems: 'flex-start',
      marginTop: 2,
    },
    accountMain: {
      flex: 1,
      flexDirection: 'column',
    },
    selectedWrapper: {
      flex: 0.2,
      alignItems: 'flex-end',
    },
    importedText: {
      color: colors.text.alternative,
      fontSize: 10,
      ...fontStyles.bold,
    },
    importedWrapper: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
  });

/**
 * View that renders specific account element in AccountList
 */
class AccountElement extends PureComponent {
  static propTypes = {
    /**
     * Callback to be called onPress
     */
    onPress: PropTypes.func.isRequired,
    /**
     * Callback to be called onLongPress
     */
    onLongPress: PropTypes.func.isRequired,
    /**
     * Current ticker
     */
    ticker: PropTypes.string,
    /**
     * Whether the account element should be disabled (opaque and not clickable)
     */
    disabled: PropTypes.bool,
    item: PropTypes.object,
    /**
     * Updated balance using stored in state
     */
    updatedBalanceFromStore: PropTypes.string,
  };

  onPress = () => {
    const { onPress } = this.props;
    const { index } = this.props.item;
    onPress && onPress(index);
  };

  onLongPress = () => {
    const { onLongPress } = this.props;
    const { address, isImported, index } = this.props.item;
    onLongPress && onLongPress(address, isImported, index);
  };

  render() {
    const { disabled, updatedBalanceFromStore, ticker } = this.props;
    const {
      address,
      name,
      ens,
      isSelected,
      isImported,
      balanceError,
      isQRHardware,
    } = this.props.item;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const selected = isSelected ? (
      <Icon name="check-circle" size={30} color={colors.primary.default} />
    ) : null;
    const tag =
      isImported || isQRHardware ? (
        <View style={styles.importedView}>
          <View style={styles.importedWrapper}>
            <Text numberOfLines={1} style={styles.importedText}>
              {strings(
                isImported ? 'accounts.imported' : 'transaction.hardware',
              )}
            </Text>
          </View>
        </View>
      ) : null;

    return (
      <View onStartShouldSetResponder={() => true}>
        <TouchableOpacity
          style={[styles.account, disabled ? styles.disabledAccount : null]}
          key={`account-${address}`}
          onPress={this.onPress}
          onLongPress={this.onLongPress}
          disabled={disabled}
        >
          <Identicon address={address} diameter={38} />
          <View style={styles.accountInfo}>
            <View style={styles.accountMain}>
              <Text numberOfLines={1} style={[styles.accountLabel]}>
                {isDefaultAccountName(name) && ens ? ens : name}
              </Text>
              <View style={styles.accountBalanceWrapper}>
                <Text style={styles.accountBalance}>
                  {renderFromWei(updatedBalanceFromStore)} {getTicker(ticker)}
                </Text>
                {!!balanceError && (
                  <Text
                    style={[styles.accountBalance, styles.accountBalanceError]}
                  >
                    {balanceError}
                  </Text>
                )}
              </View>
            </View>
            {!!tag && tag}
            <View style={styles.selectedWrapper}>{selected}</View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
}

const mapStateToProps = (
  {
    engine: {
      backgroundState: { PreferencesController, AccountTrackerController },
    },
  },
  { item: { balance, address } },
) => {
  const { selectedAddress } = PreferencesController;
  const { accounts } = AccountTrackerController;
  const selectedAccount = accounts[selectedAddress];
  const selectedAccountHasBalance =
    selectedAccount &&
    Object.prototype.hasOwnProperty.call(selectedAccount, BALANCE_KEY);
  const updatedBalanceFromStore =
    balance === EMPTY &&
    selectedAddress === address &&
    selectedAccount &&
    selectedAccountHasBalance
      ? selectedAccount[BALANCE_KEY]
      : balance;
  return {
    updatedBalanceFromStore,
  };
};

AccountElement.contextType = ThemeContext;

export default connect(mapStateToProps)(AccountElement);
