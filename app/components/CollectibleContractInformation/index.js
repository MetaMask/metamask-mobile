import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, TouchableOpacity, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { renderShortAddress } from '../../util/address';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderRadius: 10,
		minHeight: 450
	},
	titleWrapper: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor
	},
	title: {
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	label: {
		marginTop: 0,
		borderColor: colors.borderColor,
		...fontStyles.bold
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 20
	},
	content: {
		fontSize: 16,
		color: colors.fontPrimary,
		paddingTop: 10,
		...fontStyles.normal
	},
	row: {
		marginVertical: 10
	},
	footer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		height: 60,
		justifyContent: 'center',
		flexDirection: 'row',
		alignItems: 'center'
	},
	footerButton: {
		flex: 1,
		alignContent: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		height: 60
	},
	closeButton: {
		fontSize: 16,
		color: colors.primary,
		...fontStyles.normal
	}
});

/**
 * View that contains a collectible contract information as description, total supply and address
 */
export default class CollectibleContractInformation extends Component {
	static propTypes = {
		/**
		 * An function to handle the close event
		 */
		onClose: PropTypes.func,
		/**
		 * Collectible contract object
		 */
		collectibleContract: PropTypes.object
	};

	closeModal = () => {
		this.props.onClose(true);
	};

	render = () => {
		const {
			collectibleContract: { name, description, totalSupply, address }
		} = this.props;
		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title} onPress={this.closeModal}>
						{name}
					</Text>
				</View>
				<ScrollView style={styles.informationWrapper}>
					{description && (
						<View style={styles.row}>
							<Text style={styles.label}>{strings('asset_overview.description')}</Text>
							<Text style={styles.content}>{description}</Text>
						</View>
					)}
					{totalSupply && (
						<View style={styles.row}>
							<Text style={styles.label}>{strings('asset_overview.totalSupply')}</Text>
							<Text style={styles.content}>{totalSupply}</Text>
						</View>
					)}
					<View style={styles.row}>
						<Text style={styles.label}>{strings('asset_overview.address')}</Text>
						<Text style={styles.content}>{renderShortAddress(address)}</Text>
					</View>
				</ScrollView>
				<View style={styles.footer}>
					<TouchableOpacity style={styles.footerButton} onPress={this.closeModal}>
						<Text style={styles.closeButton}>{strings('networks.close')}</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	};
}
