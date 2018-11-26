import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import Screen from '../Screen';
import StyledButton from '../StyledButton';
import { getOnboardingNavbarOptions } from '../Navbar';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 30,
		alignItems: 'center'
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	text: {
		marginTop: 20,
		fontSize: 16,
		textAlign: 'center',
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	button: {
		marginTop: 40
	},
	icon: {
		color: colors.success,
		marginBottom: 30
	}
});

/**
 * View that shows the success message once
 * the sync with the extension is complete
 */
export default class SyncWithExtensionSuccess extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	static navigationOptions = ({ navigation }) => ({
		...getOnboardingNavbarOptions(navigation),
		headerLeft: null
	});

	iconSpringVal = new Animated.Value(0.4);

	componentDidMount() {
		this.animateIcon();
	}

	animateIcon() {
		Animated.spring(this.iconSpringVal, {
			toValue: 1,
			friction: 2,
			useNativeDriver: true
		}).start();
	}

	continue = () => {
		this.props.navigation.navigate('HomeNav');
	};

	render = () => (
		<Screen>
			<View style={styles.wrapper} testID={'sync-with-extension-screen'}>
				<Text style={styles.title}>{strings('sync_with_extension_success.title')}</Text>
				<Animated.View
					style={[
						styles.iconWrapper,
						{
							transform: [{ scale: this.iconSpringVal }]
						}
					]}
				>
					<Icon name="check-circle" size={150} style={styles.icon} />
				</Animated.View>
				<View>
					<Text style={styles.text}>{strings('sync_with_extension_success.sync_complete')}</Text>
					<StyledButton type="blue" onPress={this.continue} containerStyle={styles.button}>
						{strings('sync_with_extension_success.button_continue')}
					</StyledButton>
				</View>
			</View>
		</Screen>
	);
}
