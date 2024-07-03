import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { renderFromWei, weiToFiat, hexToBN } from '../../../util/number';
import Identicon from '../Identicon';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import {
  renderAccountName,
  renderShortAddress,
  safeToChecksumAddress,
  getLabelTextByAddress,
} from '../../../util/address';
import {
  getActiveTabUrl,
  getNormalizedTxState,
  getTicker,
} from '../../../util/transactions';
import Device from '../../../util/device';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { selectTicker } from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import ApproveTransactionHeader from '../../Views/confirmations/components/ApproveTransactionHeader';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { selectInternalAccounts } from '../../../selectors/accountsController';

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
     * List of accounts from the AccountsController
     */
    internalAccounts: PropTypes.array,
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
    transaction: PropTypes.object,
    activeTabUrl: PropTypes.string,
    origin: PropTypes.string,
  };

  render() {
    const {
      accounts,
      internalAccounts,
      conversionRate,
      currentCurrency,
      operation,
      ticker,
      showFiatBalance = true,
      fromAddress: rawFromAddress,
      transaction,
      activeTabUrl,
      origin,
    } = this.props;

    const fromAddress = safeToChecksumAddress(rawFromAddress);
    const accountLabelTag = getLabelTextByAddress(fromAddress);
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const weiBalance = accounts?.[fromAddress]?.balance
      ? hexToBN(accounts[fromAddress].balance)
      : 0;
    const balance = `${renderFromWei(weiBalance)} ${getTicker(ticker)}`;
    const accountLabel = renderAccountName(fromAddress, internalAccounts);
    const address = renderShortAddress(fromAddress);
    const dollarBalance = showFiatBalance
      ? weiToFiat(weiBalance, conversionRate, currentCurrency, 2)?.toUpperCase()
      : undefined;
    return operation === 'signing' && transaction !== undefined ? (
      <ApproveTransactionHeader
        origin={transaction.origin || origin}
        url={activeTabUrl}
        from={rawFromAddress}
      />
    ) : (
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
                accountLabelTag ? styles.accountNameSmall : undefined,
              ]}
            >
              {accountLabel}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.accountAddress,
                accountLabelTag ? styles.accountAddressSmall : undefined,
              ]}
            >
              ({address})
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.balanceText,
              accountLabelTag ? styles.balanceTextSmall : undefined,
            ]}
          >
            {strings('signature_request.balance_title')}{' '}
            {dollarBalance !== undefined
              ? `${dollarBalance} (${balance})`
              : balance}
          </Text>
        </View>
        {accountLabelTag && (
          <View style={styles.tag}>
            <Text variant={TextVariant.BodySMBold} style={styles.tagText}>
              {strings(accountLabelTag)}
            </Text>
          </View>
        )}
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  accounts: selectAccounts(state),
  internalAccounts: selectInternalAccounts(state),
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  ticker: selectTicker(state),
  transaction: getNormalizedTxState(state),
  activeTabUrl: getActiveTabUrl(state),
});

AccountInfoCard.contextType = ThemeContext;

export default connect(mapStateToProps)(AccountInfoCard);
