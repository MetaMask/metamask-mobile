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
		let result;
		try {
			result = await InstaPay.migrateToV2();
		} catch (e) {
			result = false;
		}

		if (result) {
			Alert.alert('Migration complete', 'Your funds have beend moved to InstaPay v2', {
				text: 'OK',
				onPress: () => {
					setTimeout(() => {
						this.dismiss();
					}, 1000);
				}
			});
		} else {
			Alert.alert('Migration failed', 'Something went wrong. Please try again later...', {
				text: 'OK',
				onPress: () => {
					setTimeout(() => {
						this.dismiss();
					}, 1000);
				}
			});
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
