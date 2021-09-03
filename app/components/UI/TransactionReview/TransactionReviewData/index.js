import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import { connect } from 'react-redux';
import Device from '../../../../util/device';

const styles = StyleSheet.create({
	root: {
		paddingHorizontal: 24,
		paddingTop: 24,
		paddingBottom: Device.isIphoneX() ? 48 : 24,
	},
	dataHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		marginBottom: 28,
	},
	dataTitleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		alignSelf: 'center',
	},
	dataDescription: {
		textAlign: 'center',
		...fontStyles.normal,
		color: colors.black,
		fontSize: 14,
		marginBottom: 28,
	},
	dataBox: {
		padding: 12,
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 8,
		flex: 1,
	},
	label: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		marginBottom: 12,
	},
	boldLabel: {
		...fontStyles.bold,
	},
	labelText: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 14,
	},
	hexData: {
		...fontStyles.normal,
		backgroundColor: colors.white,
		color: colors.black,
		fontSize: 14,
		paddingTop: 0,
	},
	scrollView: {
		flex: 1,
	},
});

/**
 * PureComponent that supports reviewing transaction data
 */
class TransactionReviewData extends PureComponent {
	static propTypes = {
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object,
		/**
		 * Transaction corresponding action key
		 */
		actionKey: PropTypes.string,
		/**
		 * Hides or shows transaction data
		 */
		toggleDataView: PropTypes.func,
		/**
		 * Height of custom gas and data modal
		 */
		customGasHeight: PropTypes.number,
	};

	applyRootHeight = () => ({ height: this.props.customGasHeight });

	render = () => {
		const {
			transaction: {
				transaction: { data },
			},
			actionKey,
			toggleDataView,
		} = this.props;
		return (
			<View style={[styles.root, this.applyRootHeight()]}>
				<View style={styles.dataHeader}>
					<TouchableOpacity onPress={toggleDataView}>
						<IonicIcon name={'ios-arrow-back'} size={24} color={colors.black} />
					</TouchableOpacity>
					<Text style={styles.dataTitleText}>{strings('transaction.data')}</Text>
					<IonicIcon name={'ios-arrow-back'} size={24} color={colors.white} />
				</View>
				<Text style={styles.dataDescription}>{strings('transaction.data_description')}</Text>
				<View style={styles.dataBox}>
					{actionKey !== strings('transactions.tx_review_confirm') && (
						<View style={styles.label}>
							<Text style={[styles.labelText, styles.boldLabel]}>
								{strings('transaction.review_function')}:{' '}
							</Text>
							<Text style={styles.labelText}>{actionKey}</Text>
						</View>
					)}
					<Text style={[styles.labelText, styles.boldLabel]}>{strings('transaction.review_hex_data')}: </Text>
					<View style={styles.scrollView}>
						<KeyboardAwareScrollView style={styles.scrollView}>
							<TouchableWithoutFeedback style={styles.scrollView}>
								<Text style={styles.hexData}>{data}</Text>
							</TouchableWithoutFeedback>
						</KeyboardAwareScrollView>
					</View>
				</View>
			</View>
		);
	};
}

const mapStateToProps = (state) => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	transaction: state.transaction,
});

export default connect(mapStateToProps)(TransactionReviewData);
