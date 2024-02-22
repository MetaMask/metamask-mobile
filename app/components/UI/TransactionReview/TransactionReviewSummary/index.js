import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import WarningMessage from '../../../Views/SendFlow/WarningMessage';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { isTestNet } from '../../../../util/networks';

const createStyles = (colors) =>
  StyleSheet.create({
    confirmBadge: {
      ...fontStyles.normal,
      alignItems: 'center',
      borderColor: colors.border.default,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.text.default,
      fontSize: 10,
      paddingVertical: 4,
      paddingHorizontal: 8,
      textAlign: 'center',
    },
    summary: {
      backgroundColor: colors.background.default,
      padding: 24,
      paddingTop: 12,
      paddingBottom: 16,
      alignItems: 'center',
    },
    summaryPrimary: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 44,
      paddingTop: 16,
      paddingBottom: 4,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    testNestSummaryPrimary: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 44,
      paddingTop: 16,
      paddingBottom: 4,
      textAlign: 'center',
    },
    summarySecondary: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 24,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    warning: {
      width: '100%',
      paddingHorizontal: 24,
      paddingTop: 12,
    },
  });

/**
 * PureComponent that supports reviewing transaction summary
 */
class TransactionReviewSummary extends PureComponent {
  static propTypes = {
    /**
     * ETH to current currency conversion rate
     */
    conversionRate: PropTypes.number,
    /**
     * Transaction corresponding action key
     */
    actionKey: PropTypes.string,
    /**
     * Transaction amount in ETH before gas
     */
    assetAmount: PropTypes.string,
    /**
     * Transaction amount in fiat before gas
     */
    fiatValue: PropTypes.string,
    /**
     * Approve type transaction or not
     */
    approveTransaction: PropTypes.bool,
    /**
     * ETH or fiat, depending on user setting
     */
    primaryCurrency: PropTypes.string,
    /**
     * Network provider chain id
     */
    chainId: PropTypes.string,
  };

  renderWarning = () => (
    <Text>{`${strings('transaction.approve_warning')} ${
      this.props.assetAmount
    }`}</Text>
  );

  render = () => {
    const {
      actionKey,
      assetAmount,
      conversionRate,
      fiatValue,
      approveTransaction,
      primaryCurrency,
      chainId,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const isTestNetResult = isTestNet(chainId);

    return (
      <View>
        {!!approveTransaction && (
          <View style={styles.warning}>
            <WarningMessage warningMessage={this.renderWarning()} />
          </View>
        )}
        <View style={styles.summary}>
          <Text style={styles.confirmBadge} numberOfLines={1}>
            {actionKey}
          </Text>

          {!conversionRate ? (
            <Text
              style={
                isTestNetResult
                  ? styles.testNestSummaryPrimary
                  : styles.summaryPrimary
              }
            >
              {assetAmount}
            </Text>
          ) : (
            <View>
              <Text
                style={
                  isTestNetResult
                    ? styles.testNestSummaryPrimary
                    : styles.summaryPrimary
                }
              >
                {primaryCurrency === 'ETH' ? assetAmount : fiatValue}
              </Text>
              <Text style={styles.summarySecondary}>
                {primaryCurrency === 'ETH' ? fiatValue : assetAmount}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };
}

TransactionReviewSummary.contextType = ThemeContext;

export default TransactionReviewSummary;
