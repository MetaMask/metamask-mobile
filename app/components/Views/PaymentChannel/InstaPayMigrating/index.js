import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Alert,
	SafeAreaView,
	Platform,
	Image,
	ActivityIndicator,
	Text,
	View,
	ScrollView,
	StyleSheet,
	BackHandler
} from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import AnimatedFox from 'react-native-animated-fox';
import { strings } from '../../../../../locales/i18n';
import InstaPay from '../../../../core/InstaPay';
// eslint-disable-next-line import/named

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white
	},
	scroll: {
		flexGrow: 1
	},
	wrapper: {
		paddingHorizontal: 40,
		paddingBottom: 30,
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1
	},
	title: {
		fontSize: 22,
		marginTop: 30,
		marginBottom: 10,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.bold
	},
	subtitle: {
		width: 295,
		fontSize: 16,
		lineHeight: 23,
		marginBottom: 40,
		color: colors.grey500,
		textAlign: 'center',
		...fontStyles.normal
	},
	foxWrapper: {
		width: Platform.OS === 'ios' ? 90 : 80,
		height: Platform.OS === 'ios' ? 90 : 80,
		marginTop: 0,
		marginBottom: 0
	},
	image: {
		alignSelf: 'center',
		width: 80,
		height: 80
	}
});

/**
 * View that is displayed to while migrating users to InstaPay 2.0
 */
export default class InstaPayMigrating extends PureComponent {
	static navigationOptions = () => ({
		header: null
	});

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * React navigation prop to know if this view is focused
		 */
		isFocused: PropTypes.bool
	};

	// Temporary disabling the back button so users can't go back
	// while creating the wallet
	handleBackPress = () => {
		if (this.props.isFocused) {
			return true;
		}
	};

	dismiss = () => {
		this.props.navigation.popToTop();
		this.props.navigation.goBack(null);
	};

	componentDidMount = async () => {
		BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
		InstaPay.hub.once('migration::complete', () => {
			Alert.alert(
				strings('payment_channel.migrating.success_title'),
				strings('payment_channel.migrating.success_message'),
				[
					{
						text: strings('payment_channel.migrating.ok_button'),
						onPress: () => {
							this.dismiss();
						}
					}
				]
			);
		});

		try {
			await InstaPay.moveFundsFromV1('migrate');
		} catch (e) {
			Alert.alert(
				strings('payment_channel.migrating.error_title'),
				strings('payment_channel.migrating.error_message'),
				[
					{
						text: strings('payment_channel.migrating.ok_button'),
						onPress: () => {
							this.dismiss();
						}
					}
				]
			);
		}
	};

	componentWillUnmount() {
		BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
	}

	render() {
		return (
			<SafeAreaView style={styles.container}>
				<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
					<View style={styles.wrapper}>
						<View style={styles.foxWrapper}>
							{Platform.OS === 'android' ? (
								<Image
									source={require('../../../../images/fox.png')}
									style={styles.image}
									resizeMethod={'auto'}
								/>
							) : (
								<AnimatedFox />
							)}
						</View>
						<Text style={styles.title}>{strings('payment_channel.migrating.title')}</Text>
						<Text style={styles.subtitle}>{strings('payment_channel.migrating.subtitle')}</Text>
						<ActivityIndicator size="large" color={Platform.OS === 'android' ? colors.blue : colors.grey} />
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}
