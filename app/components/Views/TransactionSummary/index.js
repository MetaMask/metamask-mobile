import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { strings } from '../../../../locales/i18n';
import { TRANSACTION_TYPES } from '../../../util/transactions';
import Summary from '../../Base/Summary';
import Text from '../../Base/Text';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { isTestNet } from '../../../util/networks';

const createStyles = (colors) =>
  StyleSheet.create({
    loader: {
      backgroundColor: colors.background.default,
      height: 10,
    },
  });

export default class TransactionSummary extends PureComponent {
  static propTypes = {
    amount: PropTypes.string,
    fee: PropTypes.string,
    totalAmount: PropTypes.string,
    secondaryTotalAmount: PropTypes.string,
    gasEstimationReady: PropTypes.bool,
    onEditPress: PropTypes.func,
    transactionType: PropTypes.string,
    chainId: PropTypes.string,
  };

  renderIfGastEstimationReady = (children) => {
    const { gasEstimationReady } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return !gasEstimationReady ? (
      <View style={styles.loader}>
        <ActivityIndicator size="small" />
      </View>
    ) : (
      children
    );
  };

  renderAmountTitle = () => {
    const { transactionType } = this.props;
    if (
      transactionType === TRANSACTION_TYPES.SENT_COLLECTIBLE ||
      transactionType === TRANSACTION_TYPES.RECEIVED_COLLECTIBLE
    ) {
      return strings('transaction.token_id');
    }
    return strings('transaction.amount');
  };

  render = () => {
    const {
      amount,
      fee,
      totalAmount,
      secondaryTotalAmount,
      gasEstimationReady,
      onEditPress,
      chainId,
    } = this.props;

    const isTestNetResult = isTestNet(chainId);

    if (
      this.props.transactionType === TRANSACTION_TYPES.RECEIVED_TOKEN ||
      this.props.transactionType === TRANSACTION_TYPES.RECEIVED
    ) {
      return (
        <Summary>
          <Summary.Row>
            <Text small bold primary>
              {strings('transaction.amount')}
            </Text>
            <Text small bold primary upper={!isTestNetResult}>
              {amount}
            </Text>
          </Summary.Row>
          {secondaryTotalAmount && (
            <Summary.Row end last>
              <Text small right upper={!isTestNetResult}>
                {secondaryTotalAmount}
              </Text>
            </Summary.Row>
          )}
        </Summary>
      );
    }
    return (
      <Summary>
        <Summary.Row>
          <Text small primary>
            {this.renderAmountTitle()}
          </Text>
          <Text small primary upper={!isTestNetResult}>
            {amount}
          </Text>
        </Summary.Row>
        <Summary.Row>
          <Summary.Col>
            <Text small primary italic>
              {!fee
                ? strings('transaction.transaction_fee_less')
                : strings('transaction.transaction_fee_estimated')}
            </Text>
            {!fee || !onEditPress ? null : (
              <TouchableOpacity
                disabled={!gasEstimationReady}
                onPress={onEditPress}
                key="transactionFeeEdit"
                testID=""
              >
                <Text small link>
                  {'  '}
                  {strings('transaction.edit')}
                </Text>
              </TouchableOpacity>
            )}
          </Summary.Col>
          {!!fee &&
            this.renderIfGastEstimationReady(
              <Text small primary upper={!isTestNetResult}>
                {fee}
              </Text>,
            )}
        </Summary.Row>
        <Summary.Separator />
        <Summary.Row>
          <Text small bold primary>
            {strings('transaction.total_amount')}
          </Text>
          {this.renderIfGastEstimationReady(
            <Text small bold primary upper={!isTestNetResult}>
              {totalAmount}
            </Text>,
          )}
        </Summary.Row>
        <Summary.Row end last>
          {this.renderIfGastEstimationReady(
            <Text small right upper={!isTestNetResult}>
              {secondaryTotalAmount}
            </Text>,
          )}
        </Summary.Row>
      </Summary>
    );
  };
}

TransactionSummary.contextType = ThemeContext;
