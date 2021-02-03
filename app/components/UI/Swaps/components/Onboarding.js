import React, { useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity, Image, LayoutAnimation, Platform, UIManager } from 'react-native';
import { NavigationContext } from 'react-navigation';
import { strings } from '../../../../../locales/i18n';
import Device from '../../../../util/Device';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import StyledButton from '../../StyledButton';

/* eslint-disable import/no-commonjs */
const onboardingDeviceImage = require('../../../../images/swaps_onboard_device.png');
const swapsAggregators = require('../../../../images/swaps_aggs.png');
/* eslint-enable import/no-commonjs */

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		paddingHorizontal: 25,
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	content: {
		flex: 1,
		justifyContent: 'space-around'
	},
	images: {
		alignItems: 'center'
	},
	deviceImage: {
		marginTop: 14
	},
	title: {
		fontSize: Device.isSmallDevice() ? 20 : 24,
		marginHorizontal: 15,
		marginBottom: Device.isSmallDevice() ? 16 : 22
	},
	aggregatorsImage: {
		marginVertical: 14,
		width: Device.isSmallDevice() ? 270 : 300,
		height: Device.isSmallDevice() ? 100 : 110
	},
	learnMore: {
		marginVertical: 14
	},
	learnMoreLink: {
		paddingVertical: Device.isSmallDevice() ? 4 : 8
	},
	actionButtonWrapper: {
		width: '100%'
	},
	actionButton: {
		marginVertical: 10
	}
});

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

function Onboarding({ setHasOnboarded }) {
	const navigation = useContext(NavigationContext);
	const handleStartSwapping = useCallback(() => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setHasOnboarded(true);
	}, [setHasOnboarded]);
	const handleLearnMorePress = useCallback(() => {
		navigation.navigate('Webview', {
			// TODO: replace with actual url
			url: 'https://www.example.org/'
			// title: strings('swaps.onboarding.learn_more')
		});
	}, [navigation]);
	const handleWhatArePress = useCallback(() => {
		navigation.navigate('Webview', {
			// TODO: replace with actual url
			url: 'https://www.example.org/'
			// title: strings('swaps.onboarding.what_are')
		});
	}, [navigation]);
	const handleReviewAuditsPress = useCallback(() => {
		navigation.navigate('Webview', {
			// TODO: replace with actual url
			url: 'https://www.example.org/'
			// title: strings('swaps.onboarding.review_audits')
		});
	}, [navigation]);

	return (
		<View style={styles.screen}>
			<View style={styles.content}>
				<View style={styles.images}>
					<Image source={onboardingDeviceImage} style={styles.deviceImage} />
					<Text centered primary style={styles.title}>
						{`${strings('swaps.onboarding.get_the')} `}
						<Text reset bold>
							{strings('swaps.onboarding.best_price')}
						</Text>
						{` ${strings('swaps.onboarding.from_the')} `}
						<Text reset bold>
							{strings('swaps.onboarding.top_liquidity')}
						</Text>
						{` ${strings('swaps.onboarding.sources')}`}
					</Text>
					<Text centered primary>
						{`${strings('swaps.onboarding.find_the')} `}
						<Text reset bold>
							{strings('swaps.onboarding.best_swap')}
						</Text>{' '}
						{strings('swaps.onboarding.best_swap')}
					</Text>
					<Image source={swapsAggregators} style={styles.aggregatorsImage} />
				</View>
				<View style={styles.learnMore}>
					<Title centered>{strings('swaps.onboarding.want_to_learn_more')}</Title>
					<TouchableOpacity style={styles.learnMoreLink} onPress={handleLearnMorePress}>
						<Text link centered>
							{strings('swaps.onboarding.learn_more')}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.learnMoreLink} onPress={handleWhatArePress}>
						<Text link centered>
							{strings('swaps.onboarding.what_are')}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.learnMoreLink} onPress={handleReviewAuditsPress}>
						<Text link centered>
							{strings('swaps.onboarding.review_audits')}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
			<View style={styles.actionButtonWrapper}>
				<StyledButton type="confirm" containerStyle={styles.actionButton} onPress={handleStartSwapping}>
					{strings('swaps.onboarding.start_swapping')}
				</StyledButton>
			</View>
		</View>
	);
}

Onboarding.propTypes = {
	setHasOnboarded: PropTypes.func
};

export default Onboarding;
