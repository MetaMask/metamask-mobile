import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Summary from '../../../Base/Summary';
import Text from '../../../Base/Text';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../../styles/common';
import { isMainnetByChainId } from '../../../../util/networks';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	overview: {
		marginHorizontal: 24
	},
	loader: {
		backgroundColor: colors.white,
		height: 10,
		flex: 1,
		alignItems: 'flex-end'
	},
	over: {
		color: colors.red
	},
	customNonce: {
		marginTop: 10,
		marginHorizontal: 24,
		borderWidth: 1,
		borderColor: colors.grey050,
		borderRadius: 8,
		paddingVertical: 14,
		paddingHorizontal: 16,
		display: 'flex',
		flexDirection: 'row'
	},
	nonceNumber: {
		marginLeft: 'auto'
	},
	valuesContainer: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},
	gasInfoContainer: {
		paddingHorizontal: 2
	},
	gasInfoIcon: {
		color: colors.grey200
	},
	amountContainer: {
		flex: 1,
		paddingRight: 10
	},
	gasFeeTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	}
});

const TransactionReviewEIP1559 = ({
	totalNative,
	totalConversion,
	totalMaxNative,
	gasFeeNative,
	gasFeeConversion,
	gasFeeMaxNative,
	gasFeeMaxConversion,
	primaryCurrency,
	chainId
}) => {
	const edit = () => null;

	const isMainnet = isMainnetByChainId(chainId);
	const nativeCurrencySelected = primaryCurrency === 'ETH' || !isMainnet;
	let gasFeePrimary, gasFeeSecondary, gasFeeMaxPrimary, totalPrimary, totalSecondary, totalMaxPrimary;
	if (nativeCurrencySelected) {
		gasFeePrimary = gasFeeNative;
		gasFeeSecondary = gasFeeConversion;
		gasFeeMaxPrimary = gasFeeMaxNative;
		totalPrimary = totalNative;
		totalSecondary = totalConversion;
		totalMaxPrimary = totalMaxNative;
	} else {
		gasFeePrimary = gasFeeConversion;
		gasFeeSecondary = gasFeeNative;
		gasFeeMaxPrimary = gasFeeMaxConversion;
		totalPrimary = totalConversion;
		totalSecondary = totalNative;
		totalMaxPrimary = gasFeeMaxConversion;
	}

	return (
		<Summary style={styles.overview}>
			<Summary.Row>
				<View style={styles.gasFeeTitleContainer}>
					<Text primary bold>
						Estimated gas fee
					</Text>
					<TouchableOpacity
						style={styles.gasInfoContainer}
						onPress={this.toggleGasTooltip}
						hitSlop={styles.hitSlop}
					>
						<MaterialCommunityIcons name="information" size={13} style={styles.gasInfoIcon} />
					</TouchableOpacity>
				</View>
				<View style={styles.valuesContainer}>
					{isMainnet && (
						<TouchableOpacity onPress={edit} disabled={nativeCurrencySelected}>
							<Text
								upper
								right
								grey={nativeCurrencySelected}
								link={!nativeCurrencySelected}
								underline={!nativeCurrencySelected}
								style={styles.amountContainer}
							>
								{gasFeeSecondary}
							</Text>
						</TouchableOpacity>
					)}

					<TouchableOpacity onPress={edit} disabled={!nativeCurrencySelected}>
						<Text
							primary
							bold
							upper
							grey={!nativeCurrencySelected}
							link={nativeCurrencySelected}
							underline={nativeCurrencySelected}
							right
						>
							{gasFeePrimary}
						</Text>
					</TouchableOpacity>
				</View>
			</Summary.Row>
			<Summary.Row>
				<Text small green>
					{'Very likely in < 15 seconds'}
				</Text>
				<View style={styles.valuesContainer}>
					<Text grey right small>
						Up to{' '}
						<Text bold small noMargin>
							{gasFeeMaxPrimary}
						</Text>
					</Text>
				</View>
			</Summary.Row>
			<Summary.Separator />
			<Summary.Row>
				<Text primary bold>
					Total
				</Text>
				<View style={styles.valuesContainer}>
					{isMainnet && (
						<Text grey upper right style={styles.amountContainer}>
							{totalSecondary}
						</Text>
					)}

					<Text bold primary upper right>
						{totalPrimary}
					</Text>
				</View>
			</Summary.Row>
			<Summary.Row>
				<View style={styles.valuesContainer}>
					<Text grey right small>
						Up to{' '}
						<Text bold small noMargin>
							{totalMaxPrimary}
						</Text>
					</Text>
				</View>
			</Summary.Row>
		</Summary>
	);
};

TransactionReviewEIP1559.propTypes = {
	totalNative: PropTypes.string,
	totalConversion: PropTypes.string,
	totalMaxNative: PropTypes.string,
	gasFeeNative: PropTypes.string,
	gasFeeConversion: PropTypes.string,
	gasFeeMaxNative: PropTypes.string,
	gasFeeMaxConversion: PropTypes.string,
	primaryCurrency: PropTypes.string,
	chainId: PropTypes.string
};

const mapStateToProps = state => ({
	chainId: state.engine.backgroundState.NetworkController.provider.chainId
});

export default connect(mapStateToProps)(TransactionReviewEIP1559);
