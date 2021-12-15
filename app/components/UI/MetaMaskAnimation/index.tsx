import React from 'react';
import { Animated, Dimensions, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import LottieView from 'lottie-react-native';
import { useSelector } from 'react-redux';
import { useAppThemeFromContext } from '../../../util/theme';
import { AppThemeNames } from '../../../util/theme/models';

const metamaskLogoTextOnDark = require('../../../animations/wordmark-reverse.json');
const metamaskLogoTextOnLight = require('../../../animations/wordmark.json');

const LOGO_SIZE = 175;
const LOGO_PADDING = 25;

const MetaMaskAnimation = ({
	opacity,
	animation,
	animationName,
	onAnimationFinish,
}: {
	opacity: number;
	animation: any;
	animationName: any;
	onAnimationFinish: () => void;
}): JSX.Element => {
	const appTheme: AppThemeNames = useSelector((state: any) => state.user.appTheme);
	const { colors } = useAppThemeFromContext();
	const styles = StyleSheet.create({
		main: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: colors.backgroundDefault,
		},
		metamaskName: {
			marginTop: 10,
			height: 25,
			width: 170,
			alignSelf: 'center',
			alignItems: 'center',
			justifyContent: 'center',
		},
		logoWrapper: {
			backgroundColor: colors.backgroundDefault,
			paddingTop: 50,
			marginTop: Dimensions.get('window').height / 2 - LOGO_SIZE / 2 - LOGO_PADDING,
			height: LOGO_SIZE + LOGO_PADDING * 2,
		},
		foxAndName: {
			alignSelf: 'center',
			alignItems: 'center',
			justifyContent: 'center',
		},
		animation: {
			width: 110,
			height: 110,
			alignSelf: 'center',
			alignItems: 'center',
			justifyContent: 'center',
		},
		fox: {
			width: 110,
			height: 110,
			alignSelf: 'center',
			alignItems: 'center',
			justifyContent: 'center',
		},
	});
	return (
		<View style={styles.main}>
			<Animated.View style={[styles.logoWrapper, { opacity }]}>
				<View style={styles.fox}>
					<View style={styles.foxAndName}>
						<LottieView
							ref={animation}
							style={styles.animation}
							loop={false}
							// eslint-disable-next-line
							source={require('../../../animations/fox-in.json')}
							onAnimationFinish={onAnimationFinish}
						/>
						<LottieView
							ref={animationName}
							style={styles.metamaskName}
							loop={false}
							// eslint-disable-next-line
							source={appTheme === AppThemeNames.Dark ? metamaskLogoTextOnDark : metamaskLogoTextOnLight}
						/>
					</View>
				</View>
			</Animated.View>
		</View>
	);
};

MetaMaskAnimation.propTypes = {
	opacity: PropTypes.object,
	animation: PropTypes.object,
	animationName: PropTypes.object,
	onAnimationFinish: PropTypes.func,
};

export default MetaMaskAnimation;
