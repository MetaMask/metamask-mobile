import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { TRANSACTION_TYPES } from '../../../util/transactions';
import Summary from '../../Base/Summary';
import Text from '../../Base/Text';

const styles = StyleSheet.create({
	loader: {
		backgroundColor: colors.white,
		height: 10
	}
});

export default class TransactionSummary extends PureComponent {
	static propTypes = {
		amount: PropTypes.string,
		fee: PropTypes.string,
		totalAmount: PropTypes.string,
		secondaryTotalAmount: PropTypes.string,
		gasEstimationReady: PropTypes.bool,
		onEditPress: PropTypes.func,
		transactionType: PropTypes.string
	};

	renderIfGastEstimationReady = children => {
		const { gasEstimationReady } = this.props;
		return !gasEstimationReady ? (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		) : (
			children
		);
	};

	render = () => {
		const { amount, fee, totalAmount, secondaryTotalAmount, gasEstimationReady, onEditPress } = this.props;
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
						<Text small bold primary>
							{amount}
						</Text>
					</Summary.Row>
					{secondaryTotalAmount && (
						<Summary.Row end last>
							<Text small right upper>
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
						{strings('transaction.amount')}
					</Text>
					<Text small primary>
						{amount}
					</Text>
				</Summary.Row>
				<Summary.Row>
					<Summary.Col>
						<Text small primary italic>
							{!fee
								? strings('transaction.transaction_fee_less')
								: strings('transaction.transaction_fee')}
						</Text>
						{!fee || !onEditPress ? null : (
							<TouchableOpacity
								disabled={!gasEstimationReady}
								onPress={onEditPress}
								key="transactionFeeEdit"
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
							<Text small primary upper>
								{fee}
							</Text>
						)}
				</Summary.Row>
				<Summary.Separator />
				<Summary.Row>
					<Text small bold primary>
						{strings('transaction.total_amount')}
					</Text>
					{this.renderIfGastEstimationReady(
						<Text small bold primary>
							{totalAmount}
						</Text>
					)}
				</Summary.Row>
				<Summary.Row end last>
					{this.renderIfGastEstimationReady(
						<Text small right upper>
							{secondaryTotalAmount}
						</Text>
					)}
				</Summary.Row>
			</Summary>
		);
	};
}
