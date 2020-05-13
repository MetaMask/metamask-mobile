import React, { Component } from 'react';

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import IonicIcon from 'react-native-vector-icons/Ionicons';

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
		fontSize: 14,
		flex: 1
	},
	transactionDetailsTextRight: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		flex: 1,
		textAlign: 'right'
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
	}
});

export default class TransactionReviewDetailsCard extends Component {
	static propTypes = {
		toggleViewDetails: PropTypes.func,
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
						<Text style={styles.customGasModalTitleText}>Transaction Details</Text>
						<IonicIcon name={'ios-arrow-back'} size={24} color={colors.white} />
					</View>
					<View style={styles.transactionDetails}>
						<View style={styles.transactionDetailsRow}>
							<Text style={styles.transactionDetailsTextLeft}>Site Url</Text>
							<Text style={styles.transactionDetailsTextRight}>{host}</Text>
						</View>
						<View style={styles.transactionDetailsRow}>
							<Text style={styles.transactionDetailsTextLeft}>Contract name:</Text>
							<Text style={styles.transactionDetailsTextRight}>name??</Text>
						</View>
						<View style={styles.transactionDetailsRow}>
							<Text style={styles.transactionDetailsTextLeft}>Contract address:</Text>
							<Text style={styles.transactionDetailsTextRight}>{address}</Text>
						</View>
						<View style={styles.transactionDetailsRow}>
							<Text style={styles.transactionDetailsTextLeft}>Allowance:</Text>
							<Text style={styles.transactionDetailsTextRight}>
								{allowance} {tokenSymbol}
							</Text>
						</View>
					</View>
					<View style={styles.viewData}>
						<TouchableOpacity style={styles.viewDataRow} onPress={toggleViewData}>
							<Text style={styles.viewDataTitle}>View Data</Text>
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
					{/*<View style={styles.sectionTitleRow}>
            <FontAwesome5
              name={'user-check'}
              size={20}
              color={colors.grey500}
              onPress={this.toggleEditPermission}
            />
            <Text style={[styles.sectionTitleText, styles.sectionLeft]}>
              {strings('spend_limit_edition.permission_request')}
            </Text>
            <TouchableOpacity
              style={styles.sectionRight}
              onPress={this.toggleEditPermission}
            >
              <Text style={styles.editText}>{strings('spend_limit_edition.edit')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <Text style={styles.sectionExplanationText}>
              {strings('spend_limit_edition.details_explanation', { host })}
            </Text>
          </View>
          <Text style={styles.permissionDetails}>
            <Text style={fontStyles.bold}>{strings('spend_limit_edition.amount')}</Text>{' '}
            {`${amount} ${tokenSymbol}`}
          </Text>
          <View style={styles.row}>
            <Text style={styles.permissionDetails}>
              <Text style={fontStyles.bold}>{strings('spend_limit_edition.to')}</Text>{' '}
              {strings('spend_limit_edition.contract', {
                address: renderShortAddress(transaction.to)
              })}
            </Text>
            <Feather
              name="copy"
              size={16}
              color={colors.blue}
              style={styles.copyIcon}
              onPress={this.copyContractAddress}
            />
          </View>*/}
				</View>
				{/*<View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <FontAwesome5 solid name={'file-alt'} size={20} color={colors.grey500} />
            <Text style={[styles.sectionTitleText, styles.sectionLeft]}>
              {strings('spend_limit_edition.data')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.sectionExplanationText}>
              {strings('spend_limit_edition.function_approve')}
            </Text>
          </View>
          <Text style={styles.sectionExplanationText}>{transaction.data}</Text>
        </View>*/}
			</>
		);
	}
}
