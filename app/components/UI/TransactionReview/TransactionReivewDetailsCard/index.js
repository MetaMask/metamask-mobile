import React, { Component } from 'react';

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../../locales/i18n';
import Feather from 'react-native-vector-icons/Feather';

const styles = StyleSheet.create({
	viewData: {
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		padding: 16,
		marginTop: 20
	},
	viewDataRow: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'wrap'
	},
	viewDataTitle: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14
	},
	viewDataText: {
		marginTop: 20
	},
	viewDataArrow: {
		marginLeft: 'auto'
	},
	transactionDetails: {
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		padding: 16
	},
	transactionDetailsRow: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingVertical: 4
	},
	transactionDetailsTextLeft: {
		...fontStyles.thin,
		color: colors.black,
		fontSize: 14
	},
	transactionDetailsTextRight: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		textAlign: 'right',
		flexDirection: 'row',
		marginLeft: 'auto'
	},
	section: {
		flexDirection: 'column',
		padding: 24
	},
	customGasHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		paddingBottom: 20
	},
	customGasModalTitleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 18,
		alignSelf: 'center',
		margin: 16
	},
	copyIcon: {
		marginLeft: 1,
		marginTop: 2
	},
	address: {
		...fontStyles.bold,
		color: colors.blue
	}
});

export default class TransactionReviewDetailsCard extends Component {
	static propTypes = {
		toggleViewDetails: PropTypes.func,
		copyContractAddress: PropTypes.func,
		toggleViewData: PropTypes.func,
		address: PropTypes.string,
		host: PropTypes.string,
		allowance: PropTypes.string,
		tokenSymbol: PropTypes.string,
		data: PropTypes.string,
		displayViewData: PropTypes.bool
	};

	render() {
		const {
			toggleViewDetails,
			toggleViewData,
			copyContractAddress,
			address,
			host,
			allowance,
			tokenSymbol,
			data,
			displayViewData
		} = this.props;
		return (
			<>
				<View style={styles.section}>
					<View style={styles.customGasHeader}>
						<TouchableOpacity onPress={toggleViewDetails}>
							<IonicIcon name={'ios-arrow-back'} size={24} color={colors.black} />
						</TouchableOpacity>
						<Text style={styles.customGasModalTitleText}>
							{strings('spend_limit_edition.transaction_details')}
						</Text>
						<IonicIcon name={'ios-arrow-back'} size={24} color={colors.white} />
					</View>
					<View style={styles.transactionDetails}>
						<View style={styles.transactionDetailsRow}>
							<Text style={styles.transactionDetailsTextLeft}>
								{strings('spend_limit_edition.site_url')}
							</Text>
							<Text style={styles.transactionDetailsTextRight}>{host}</Text>
						</View>
						<View style={styles.transactionDetailsRow}>
							<Text style={styles.transactionDetailsTextLeft}>
								{strings('spend_limit_edition.contract_name')}
							</Text>
							<Text style={styles.transactionDetailsTextRight}>name??</Text>
						</View>
						<View style={styles.transactionDetailsRow}>
							<Text style={styles.transactionDetailsTextLeft}>
								{strings('spend_limit_edition.contract_address')}
							</Text>
							<View style={styles.transactionDetailsTextRight}>
								<Text style={styles.address}>{address}</Text>
								<Feather
									name="copy"
									size={16}
									color={colors.blue}
									style={styles.copyIcon}
									onPress={copyContractAddress}
								/>
							</View>
						</View>
						<View style={styles.transactionDetailsRow}>
							<Text style={styles.transactionDetailsTextLeft}>
								{strings('spend_limit_edition.allowance')}
							</Text>
							<Text style={styles.transactionDetailsTextRight}>
								{allowance} {tokenSymbol}
							</Text>
						</View>
					</View>
					<View style={styles.viewData}>
						<TouchableOpacity style={styles.viewDataRow} onPress={toggleViewData}>
							<Text style={styles.viewDataTitle}>{strings('spend_limit_edition.view_data')}</Text>
							<View style={styles.viewDataArrow}>
								<IonicIcon
									name={`ios-arrow-${displayViewData ? 'up' : 'down'}`}
									size={16}
									color={colors.grey500}
								/>
							</View>
						</TouchableOpacity>
						{displayViewData ? <Text style={styles.viewDataText}>{data}</Text> : null}
					</View>
				</View>
			</>
		);
	}
}
