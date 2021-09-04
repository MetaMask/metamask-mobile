import React, { PureComponent } from 'react';
import { TouchableOpacity, ScrollView, Text, View, StyleSheet, InteractionManager, BackHandler } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import PreventScreenshot from '../../../core/PreventScreenshot';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	wrapper: {
		flex: 1,
	},
	content: {
		alignItems: 'flex-start',
	},
	title: {
		fontSize: 32,
		marginTop: 10,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal,
	},
	dataRow: {
		marginBottom: 10,
	},
	label: {
		fontSize: 16,
		lineHeight: 23,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal,
	},
	icon: {
		textAlign: 'left',
		fontSize: 90,
		marginTop: 0,
		marginLeft: 0,
	},
	top: {
		paddingTop: 0,
		padding: 30,
	},
	navbarRightButton: {
		alignSelf: 'flex-end',
		paddingHorizontal: 22,
		paddingTop: 20,
		paddingBottom: 10,
		marginTop: Device.isIphoneX() ? 40 : 20,
	},
	closeIcon: {
		fontSize: 28,
		color: colors.fontSecondary,
	},
});

/**
 * View that's displayed the first time imports account
 */
class ImportPrivateKeySuccess extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		 * List of keyrings
		 */
		keyrings: PropTypes.array,
	};

	componentDidMount = () => {
		const { PreferencesController } = Engine.context;
		const { keyrings } = this.props;
		try {
			const allKeyrings =
				keyrings && keyrings.length ? keyrings : Engine.context.KeyringController.state.keyrings;
			const accountsOrdered = allKeyrings.reduce((list, keyring) => list.concat(keyring.accounts), []);
			PreferencesController.setSelectedAddress(accountsOrdered[accountsOrdered.length - 1]);
		} catch (e) {
			Logger.error(e, 'Error while refreshing imported pkey');
		}
		InteractionManager.runAfterInteractions(() => {
			PreventScreenshot.forbid();
			BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
		});
	};

	componentWillUnmount = () => {
		InteractionManager.runAfterInteractions(() => {
			PreventScreenshot.allow();
			BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
		});
	};

	handleBackPress = () => {
		this.props.navigation.popToTop();
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
					<View style={styles.content} testID={'import-success-screen'}>
						<TouchableOpacity
							onPress={this.dismiss}
							style={styles.navbarRightButton}
							testID={'import-close-button'}
						>
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

const mapStateToProps = (state) => ({
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
});

export default connect(mapStateToProps)(ImportPrivateKeySuccess);
