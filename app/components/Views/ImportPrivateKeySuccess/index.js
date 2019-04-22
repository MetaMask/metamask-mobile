import React, { Component } from 'react';
import { TouchableOpacity, ScrollView, Text, View, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { strings } from '../../../../locales/i18n';
import DeviceSize from '../../../util/DeviceSize';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 32,
		marginTop: 10,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	dataRow: {
		marginBottom: 10
	},
	label: {
		fontSize: 16,
		lineHeight: 23,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	icon: {
		textAlign: 'left',
		fontSize: 90,
		marginTop: 0,
		marginLeft: 0
	},
	top: {
		paddingTop: 0,
		padding: 30
	},
	navbarRightButton: {
		alignSelf: 'flex-end',
		paddingHorizontal: 22,
		paddingTop: 20,
		paddingBottom: 10,
		marginTop: DeviceSize.isIphoneX() ? 40 : 20
	},
	closeIcon: {
		fontSize: 28,
		color: colors.fontSecondary
	}
});

/**
 * View that's displayed the first time a user receives funds
 */
export default class ImportPrivateKey extends Component {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	dismiss = () => {
		this.props.navigation.popToTop();
		this.props.navigation.goBack(null);
	};

	render() {
		return (
			<View style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.wrapper}
					style={styles.mainWrapper}
					testID={'first-incoming-transaction-screen'}
				>
					<View style={styles.content}>
						<TouchableOpacity onPress={this.dismiss} style={styles.navbarRightButton}>
							<MaterialIcon name="close" size={15} style={styles.closeIcon} />
						</TouchableOpacity>
						<View style={styles.top}>
							<Icon name="ios-checkmark-circle-outline" style={styles.icon} color={colors.green500} />
							<Text style={styles.title}>{strings('import_private_key_success.title')}</Text>
							<View style={styles.dataRow}>
								<Text style={styles.label}>
									{strings('import_private_key_success.description_one')}
								</Text>
							</View>
						</View>
					</View>
				</ScrollView>
			</View>
		);
	}
}
