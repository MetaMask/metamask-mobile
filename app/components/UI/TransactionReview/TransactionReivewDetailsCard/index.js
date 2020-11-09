import React, { Component } from 'react';

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../../locales/i18n';
import Feather from 'react-native-vector-icons/Feather';
import ConnectHeader from '../../../UI/ConnectHeader';

const styles = StyleSheet.create({
	uppercase: {
		textTransform: 'capitalize'
	},
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
		minWidth: '100%',
		width: '100%',
		paddingHorizontal: 16,
		paddingBottom: 16
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
		displayViewData: PropTypes.bool,
		method: PropTypes.string
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
			method,
			displayViewData
		} = this.props;

		return (
			<View style={styles.section}>
				<ConnectHeader action={toggleViewDetails} title={strings('spend_limit_edition.transaction_details')} />
				<View style={styles.transactionDetails}>
					<View style={styles.transactionDetailsRow}>
						<Text style={styles.transactionDetailsTextLeft}>{strings('spend_limit_edition.site_url')}</Text>
						<Text style={styles.transactionDetailsTextRight}>{host}</Text>
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
					{displayViewData ? (
						<>
							<Text style={[styles.viewDataText, styles.uppercase]}>
								{strings('spend_limit_edition.function')}: {method}
							</Text>
							<Text style={styles.viewDataText}>{data}</Text>
						</>
					) : null}
				</View>
			</View>
		);
	}
}
