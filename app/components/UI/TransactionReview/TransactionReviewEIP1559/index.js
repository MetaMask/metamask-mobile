import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Summary from '../../../Base/Summary';
import Text from '../../../Base/Text';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../../styles/common';

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

const TransactionReviewEIP1559 = () => {
	const edit = () => null;

	const isMainnet = true;
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
					<Text upper right grey style={styles.amountContainer}>
						$7.00
					</Text>

					<TouchableOpacity onPress={edit}>
						<Text primary bold upper link underline right>
							0.02122 ETH
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
						From{' '}
						<Text bold small noMargin>
							0.02122 - 0.02134 ETH
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
							$27.85
						</Text>
					)}

					<Text bold primary upper right>
						0.03127 ETH
					</Text>
				</View>
			</Summary.Row>
			<Summary.Row>
				<View style={styles.valuesContainer}>
					<Text grey right small>
						Up to{' '}
						<Text bold small noMargin>
							0.03138 ETH
						</Text>
					</Text>
				</View>
			</Summary.Row>
		</Summary>
	);
};

export default TransactionReviewEIP1559;
