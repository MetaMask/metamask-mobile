import isUrl from 'is-url';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import SDKConnect from '../../../core/SDKConnect/SDKConnect';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectEvmTicker } from '../../../selectors/networkController';
import { fontStyles } from '../../../styles/common';
import {
  getLabelTextByAddress,
  renderAccountName,
  renderShortAddress,
  safeToChecksumAddress,
  getInternalAccountByAddress,
  renderShortAccountName,
} from '../../../util/address';
import Device from '../../../util/device';
import { hexToBN, renderFromWei, weiToFiat } from '../../../util/number';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  getActiveTabUrl,
  getNormalizedTxState,
  getTicker,
} from '../../../util/transactions';
import ApproveTransactionHeader from '../../Views/confirmations/legacy/components/ApproveTransactionHeader';
import Identicon from '../Identicon';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { selectSignatureRequests } from '../../../selectors/signatureController';
import { selectAccountToGroupMap } from '../../../selectors/multichainAccounts/accountTreeController';

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
      marginLeft: 8,
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
    origin: PropTypes.string,
    signatureRequests: PropTypes.object,
    accountToGroupMap: PropTypes.object,
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
      origin,
      signatureRequests,
      accountToGroupMap,
    } = this.props;

    const signatureRequest = Object.values(signatureRequests || {})?.[0];
    const fromAddress = safeToChecksumAddress(rawFromAddress);
    const accountLabelTag = getLabelTextByAddress(fromAddress);
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const weiBalance = accounts?.[fromAddress]?.balance
      ? hexToBN(accounts[fromAddress].balance)
      : 0;
    const balance = `${renderFromWei(weiBalance)} ${getTicker(ticker)}`;

    const account = getInternalAccountByAddress(fromAddress);
    const accountGroup =
      account && accountToGroupMap ? accountToGroupMap[account.id] : undefined;

    const accountLabel =
      accountGroup?.metadata?.name ||
      renderAccountName(fromAddress, internalAccounts);
    const address = renderShortAddress(fromAddress);
    const dollarBalance = showFiatBalance
      ? weiToFiat(weiBalance, conversionRate, currentCurrency, 2)?.toUpperCase()
      : undefined;

    const sdkConnections = SDKConnect.getInstance().getConnections();

    const currentConnection = sdkConnections[origin ?? ''];

    const isOriginUrl = isUrl(origin);

    const originatorInfo = currentConnection?.originatorInfo;

    const sdkDappMetadata = {
      url: isOriginUrl
        ? origin
        : (originatorInfo?.url ?? strings('sdk.unknown')),
      icon: originatorInfo?.icon,
    };
    const actualOriginUrl = isOriginUrl
      ? origin
      : (originatorInfo?.url ?? strings('sdk.unknown'));

    return operation === 'signing' && transaction !== undefined ? (
      <ApproveTransactionHeader
        chainId={transaction?.chainId ?? signatureRequest?.chainId}
        origin={actualOriginUrl}
        url={actualOriginUrl}
        from={rawFromAddress}
        sdkDappMetadata={sdkDappMetadata}
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
              tooltip={accountLabel}
            >
              {renderShortAccountName(accountLabel)}
            </Text>
          </View>
          <View style={styles.accountNameAndAddress}>
            <Text
              numberOfLines={1}
              style={[
                styles.accountAddress,
                accountLabelTag ? styles.accountAddressSmall : undefined,
              ]}
            >
              {address}
            </Text>
          </View>
          <View style={styles.accountNameAndAddress}>
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
        </View>
        {accountLabelTag && (
          <View style={styles.tag}>
            <Text variant={TextVariant.BodySMBold} style={styles.tagText}>
              {accountLabelTag}
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
  ticker: selectEvmTicker(state),
  transaction: getNormalizedTxState(state),
  activeTabUrl: getActiveTabUrl(state),
  signatureRequests: selectSignatureRequests(state),
  accountToGroupMap: selectAccountToGroupMap(state),
});

AccountInfoCard.contextType = ThemeContext;

export default connect(mapStateToProps)(AccountInfoCard);
