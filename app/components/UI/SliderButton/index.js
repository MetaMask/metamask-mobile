import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, PanResponder, StyleSheet, Image, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';

/* eslint-disable import/no-commonjs */
const SliderBgImg = require('./assets/slider_button_gradient.png');
const SliderShineImg = require('./assets/slider_button_shine.png');
/* eslint-enable import/no-commonjs */

const DIAMETER = 60;
const MARGIN = DIAMETER * 0.16;
const COMPLETE_VERTICAL_THRESHOLD = DIAMETER * 2;
const COMPLETE_THRESHOLD = 0.85;
const COMPLETE_DELAY = 1000;

const styles = StyleSheet.create({
	container: {
		shadowRadius: 8,
		shadowOpacity: 0.5,
		shadowColor: colors.blue200,
		shadowOffset: { width: 0, height: 3 },
		elevation: 0 // shadow colors not supported on Android. nothing > gray shadow
	},
	disabledContainer: {
		opacity: 0.66
	},
	slider: {
		position: 'absolute',
		width: DIAMETER,
		height: DIAMETER,
		borderRadius: DIAMETER,
		borderWidth: MARGIN,
		borderColor: colors.blue600,
		backgroundColor: colors.white
	},
	trackBack: {
		position: 'relative',
		overflow: 'hidden',
		width: '100%',
		height: DIAMETER,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: DIAMETER,
		backgroundColor: colors.blue700
	},
	trackBackGradient: {
		position: 'absolute',
		width: '100%',
		height: '100%'
	},
	trackBackGradientPressed: {
		opacity: 0.66
	},
	trackBackShine: {
		position: 'absolute',
		height: '200%',
		left: 0
	},
	trackFront: {
		position: 'absolute',
		overflow: 'hidden',
		height: '100%',
		borderRadius: DIAMETER
	},

	textFrontContainer: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center'
	},
	textBack: {
		...fontStyles.normal,
		color: colors.white,
		fontSize: 16
	},
	textFront: {
		...fontStyles.normal,
		color: colors.white,
		fontSize: 16
	}
});

function SliderButton({ incompleteText, completeText, onComplete, disabled }) {
	const [componentWidth, setComponentWidth] = useState(0);
	const [isComplete, setIsComplete] = useState(false);
	const [shouldComplete, setShouldComplete] = useState(false);
	const [isPressed, setIsPressed] = useState(false);

	const shineOffset = useRef(new Animated.Value(0)).current;
	const pan = useRef(new Animated.ValueXY(0, 0)).current;
	const completion = useRef(new Animated.Value(0)).current;

	const sliderPosition = useMemo(
		() =>
			pan.x.interpolate({
				inputRange: [0, Math.max(componentWidth - DIAMETER, 0)],
				outputRange: [0, componentWidth - DIAMETER],
				extrapolate: 'clamp'
			}),
		[componentWidth, pan.x]
	);

	const incompleteTextOpacity = sliderPosition.interpolate({
		inputRange: [0, Math.max(componentWidth - DIAMETER, 0)],
		outputRange: [1, 0]
	});
	const shineOpacity = incompleteTextOpacity.interpolate({
		inputRange: [0, 0.5, 1],
		outputRange: [0, 0, 1]
	});
	const sliderCompletedOpacity = completion.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
	const trackFrontBackgroundColor = completion.interpolate({
		inputRange: [0, 1],
		outputRange: [colors.blue600, colors.success]
	});

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => !disabled && !(shouldComplete || isComplete),
				onMoveShouldSetPanResponder: () => !disabled && !(shouldComplete || isComplete),
				onPanResponderGrant: () => setIsPressed(true),
				onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
				onPanResponderRelease: (evt, gestureState) => {
					setIsPressed(false);
					if (
						Math.abs(gestureState.dy) < COMPLETE_VERTICAL_THRESHOLD &&
						gestureState.dx / (componentWidth - DIAMETER) >= COMPLETE_THRESHOLD
					) {
						setShouldComplete(true);
					} else {
						Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
					}
				}
			}),
		[componentWidth, disabled, isComplete, pan, shouldComplete]
	);
	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(shineOffset, { toValue: 0, duration: 0, useNativeDriver: false }),
				Animated.timing(shineOffset, {
					toValue: 100,
					duration: 2000,
					useNativeDriver: false
				})
			])
		).start();
	}, [shineOffset]);

	useEffect(() => {
		if (!isComplete && shouldComplete) {
			let completeTimeout;
			Animated.parallel([
				Animated.spring(completion, { toValue: 1, useNativeDriver: false }),
				Animated.spring(pan, { toValue: { x: componentWidth, y: 0 }, useNativeDriver: false })
			]).start(() => {
				completeTimeout = setTimeout(() => {
					setIsComplete(true);
					if (onComplete) {
						onComplete();
					}
				}, COMPLETE_DELAY);
			});

			return () => {
				clearTimeout(completeTimeout);
			};
		}
	}, [completion, componentWidth, isComplete, onComplete, pan, shouldComplete]);

	return (
		<View
			style={[styles.container, disabled && styles.disabledContainer]}
			onLayout={e => {
				setComponentWidth(e.nativeEvent.layout.width);
			}}
		>
			<View style={styles.trackBack}>
				<Image
					style={[styles.trackBackGradient, isPressed && styles.trackBackGradientPressed]}
					source={SliderBgImg}
					resizeMode="stretch"
				/>
				{!disabled && (
					<Animated.Image
						style={[
							styles.trackBackShine,
							{
								opacity: shineOpacity,
								transform: [
									{
										translateX: shineOffset.interpolate({
											inputRange: [0, 100],
											outputRange: [-142, componentWidth + 142]
										})
									}
								]
							}
						]}
						source={SliderShineImg}
						resizeMode={'contain'}
					/>
				)}
				<Animated.View
					style={{
						opacity: incompleteTextOpacity
					}}
				>
					<Text style={styles.textBack}>{incompleteText}</Text>
				</Animated.View>
			</View>
			<Animated.View
				style={[
					styles.trackFront,
					{
						backgroundColor: trackFrontBackgroundColor,
						width: Animated.add(sliderPosition, DIAMETER)
					}
				]}
			>
				<View style={[styles.textFrontContainer, { width: componentWidth }]}>
					<Text style={styles.textFront}>{completeText}</Text>
				</View>
			</Animated.View>
			<Animated.View
				{...panResponder.panHandlers}
				style={[
					styles.slider,
					{ opacity: sliderCompletedOpacity, transform: [{ translateX: sliderPosition }] }
				]}
			/>
		</View>
	);
}

SliderButton.propTypes = {
	/**
	 * Text that prompts the user to interact with the slider
	 */
	incompleteText: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
	/**
	 * Text during ineraction stating the action being taken
	 */
	completeText: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
	/**
	 * Action to execute once button completes sliding
	 */
	onComplete: PropTypes.func,
	/**
	 * Value that decides whether or not the slider is disabled
	 */
	disabled: PropTypes.bool
};

export default SliderButton;
