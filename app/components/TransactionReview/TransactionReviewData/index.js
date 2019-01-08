import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	overview: {
		paddingHorizontal: 16
	},
	label: {
		flex: 0,
		paddingRight: 18
	},
	labelText: {
		...fontStyles.bold,
		color: colors.gray,
		fontSize: 12
	},
	functionType: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 12,
		padding: 16
	},
	hexData: {
		...fontStyles.normal,
		backgroundColor: colors.white,
		color: colors.black,
		flex: 1,
		fontSize: 12,
		minHeight: 64,
		padding: 16
	},
	topOverviewRow: {
		borderBottomWidth: 1,
		borderColor: colors.lightGray
	},
	overviewRow: {
		paddingVertical: 15
	}
});

/**
 * Component that supports reviewing transaction data
 */
export default class TransactionReviewData extends Component {
	static propTypes = {
		/**
		 * Transaction object associated with this transaction
		 */
		transactionData: PropTypes.object,
		/**
		 * Transaction corresponding action key
		 */
		actionKey: PropTypes.string
	};

	render = () => {
		const {
			transactionData: { data },
			actionKey
		} = this.props;
		return (
			<View style={styles.overview}>
				{actionKey !== strings('transactions.tx_review_confirm') && (
					<View style={[styles.overviewRow, styles.topOverviewRow]}>
						<View style={styles.label}>
							<Text style={styles.labelText}>{strings('transaction.review_function_type')}</Text>
							<Text style={styles.functionType}>{actionKey}</Text>
						</View>
					</View>
				)}
				<View style={styles.overviewRow}>
					<View style={styles.label}>
						<Text style={styles.labelText}>{strings('transaction.review_hex_data')}:</Text>
					</View>
					<TextInput
						multiline
						placeholder={strings('transaction.optional')}
						style={styles.hexData}
						value={data}
						editable={false}
					/>
				</View>
			</View>
		);
	};
}
