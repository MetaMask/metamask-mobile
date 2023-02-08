import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { renderFromWei, weiToFiat, hexToBN } from '../../../util/number';
import Identicon from '../Identicon';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import {
  renderAccountName,
  renderShortAddress,
  safeToChecksumAddress,
} from '../../../util/address';
import { getTicker } from '../../../util/transactions';
import Engine from '../../../core/Engine';
import { QR_HARDWARE_WALLET_DEVICE } from '../../../constants/keyringTypes';
import Device from '../../../util/device';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    accountInformation: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: Device.isMediumDevice() ? 8 : 16,
      alignItems: 'center',
    },
    identicon: {
      marginRight: 8,
    },
    accountInfoRow: {
      flexGrow: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'flex-start',
      marginRight: 8,
    },
    accountNameAndAddress: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    accountName: {
      maxWidth: Device.isMediumDevice() ? '35%' : '45%',
      ...fontStyles.bold,
      fontSize: 16,
      marginRight: 2,
      color: colors.text.default,
    },
    accountNameSmall: {
      fontSize: 12,
    },
    accountAddress: {
      flexGrow: 1,
      ...fontStyles.bold,
      fontSize: 16,
      color: colors.text.default,
    },
    accountAddressSmall: {
      fontSize: 12,
    },
    balanceText: {
      ...fontStyles.thin,
      fontSize: 14,
      alignSelf: 'flex-start',
      color: colors.text.default,
    },
    balanceTextSmall: {
      fontSize: 12,
    },
    tag: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.text.default,
      padding: 4,
      minWidth: 42,
    },
    tagText: {
      textAlign: 'center',
      fontSize: 8,
      ...fontStyles.bold,
      color: colors.text.default,
    },
  });

class AccountInfoCard extends PureComponent {
  static propTypes = {
    /**
     * A string that represents the from address.
     */
    fromAddress: PropTypes.string.isRequired,
    /**
     * Map of accounts to information objects including balances
     */
    accounts: PropTypes.object,
    /**
     * List of accounts from the PreferencesController
     */
    identities: PropTypes.object,
    /**
     * A number that specifies the ETH/USD conversion rate
     */
    conversionRate: PropTypes.number,
    /**
     * The selected currency
     */
    currentCurrency: PropTypes.string,
    /**
     * Declares the operation being performed i.e. 'signing'
     */
    operation: PropTypes.string,
    /**
     * Clarify should show fiat balance
     */
    showFiatBalance: PropTypes.bool,
    /**
     * Current selected ticker
     */
    ticker: PropTypes.string,
  };

  state = {
    isHardwareKeyring: false,
  };

  componentDidMount() {
    const { KeyringController } = Engine.context;
    const { fromAddress } = this.props;
    KeyringController.getAccountKeyringType(fromAddress).then((type) => {
      if (type === QR_HARDWARE_WALLET_DEVICE) {
        this.setState({ isHardwareKeyring: true });
      }
    });
  }

  render() {
    const {
      accounts,
      identities,
      conversionRate,
      currentCurrency,
      operation,
      ticker,
      showFiatBalance = true,
      fromAddress: rawFromAddress,
    } = this.props;
    const fromAddress = safeToChecksumAddress(rawFromAddress);
    const { isHardwareKeyring } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const weiBalance = accounts?.[fromAddress]?.balance
      ? hexToBN(accounts[fromAddress].balance)
      : 0;
    const balance = `(${renderFromWei(weiBalance)} ${getTicker(ticker)})`;
    const accountLabel = renderAccountName(fromAddress, identities);
    const address = renderShortAddress(fromAddress);
    const dollarBalance = weiToFiat(
      weiBalance,
      conversionRate,
      currentCurrency,
      2,
    )?.toUpperCase();
    return (
      <View style={styles.accountInformation}>
        <Identicon
          address={fromAddress}
          diameter={40}
          customStyle={styles.identicon}
        />
        <View style={styles.accountInfoRow}>
          <View style={styles.accountNameAndAddress}>
            <Text
              numberOfLines={1}
              style={[
                styles.accountName,
                isHardwareKeyring ? styles.accountNameSmall : undefined,
              ]}
            >
              {accountLabel}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.accountAddress,
                isHardwareKeyring ? styles.accountAddressSmall : undefined,
              ]}
            >
              ({address})
            </Text>
          </View>
          {operation === 'signing' ? null : (
            <Text
              numberOfLines={1}
              style={[
                styles.balanceText,
                isHardwareKeyring ? styles.balanceTextSmall : undefined,
              ]}
            >
              {strings('signature_request.balance_title')}{' '}
              {showFiatBalance ? dollarBalance : ''} {balance}
            </Text>
          )}
        </View>
        {isHardwareKeyring && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {strings('transaction.hardware')}
            </Text>
          </View>
        )}
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  identities: state.engine.backgroundState.PreferencesController.identities,
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
});

AccountInfoCard.contextType = ThemeContext;

export default connect(mapStateToProps)(AccountInfoCard);
