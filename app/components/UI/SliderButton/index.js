import React, { PureComponent } from 'react';
import { View, Animated, PanResponder, StyleSheet, Image, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';

/* eslint-disable import/no-commonjs */
const SliderBgImg = require('../../../images/sliderbutton-bg.png');
const SliderShineImg = require('../../../images/sliderbutton-shine.png');
/* eslint-enable import/no-commonjs */

const BLUE = 0;
const GREEN = 1;
const GRADIENT_OFFSET = 45;
const DIAMETER = 50;
const MARGIN = 8;
const ABSOLUTE_CENTER = {
	position: 'absolute',
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	justifyContent: 'center',
	alignItems: 'center'
};

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.blue700,
		borderRadius: DIAMETER,
		marginBottom: 10
	},
	slider: {
		alignSelf: 'flex-end',
		width: DIAMETER,
		height: DIAMETER,
		borderRadius: DIAMETER,
		borderWidth: MARGIN,
		borderColor: colors.blue600,
		backgroundColor: colors.white
	},
	trackBack: {
		...ABSOLUTE_CENTER,
		flexGrow: 1,
		overflow: 'hidden',
		borderRadius: DIAMETER
	},
	trackBackShineContainer: {
		position: 'absolute',
		left: 0
	},
	trackBackShine: {
		left: -GRADIENT_OFFSET
	},
	trackBackGradient: {
		position: 'absolute',
		left: -GRADIENT_OFFSET
	},
	trackFront: {
		alignSelf: 'flex-start',
		borderRadius: DIAMETER,
		top: 0,
		overflow: 'hidden'
	},
	trackFrontContainer: {
		flexGrow: 0,
		shadowRadius: 15,
		shadowOpacity: 0.5,
		shadowColor: colors.blue200,
		shadowOffset: { width: 0, height: 5 },
		elevation: 0 // shadow colors not supported on Android. nothing > gray shadow
	},
	textBack: {
		...fontStyles.normal,
		color: colors.white,
		fontSize: 16
	},
	textFrontContainer: {
		...ABSOLUTE_CENTER
	},
	textFront: {
		...fontStyles.normal,
		color: colors.white,
		fontSize: 16
	}
});

const SliderBg = () => <Image style={styles.trackBackGradient} source={SliderBgImg} />;
const SliderShine = () => <Image style={styles.trackBackShine} source={SliderShineImg} />;

class SliderButton extends PureComponent {
	static propTypes = {
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
		onComplete: PropTypes.func.isRequired,
		/**
		 * Value that decides whether or not the slider is disabled
		 */
		disabled: PropTypes.bool
	};

	state = {
		trackBackGradient: null,
		componentWidth: 0,
		panX: 0,
		isComplete: false
	};

	shineAnimating = false;
	shineOffset = new Animated.Value(0);
	sliderWidth = new Animated.Value(DIAMETER);
	bgColor = new Animated.Value(BLUE);
	pan = new Animated.ValueXY();

	panResponder = PanResponder.create({
		onMoveShouldSetPanResponder: () => true,
		onPanResponderMove: (evt, gestureState) => {
			if (this.props.disabled) {
				this.reset();
				return;
			}
			if (this.state.isComplete) {
				return;
			}
			const moveSlider = Animated.event([null, { dx: this.pan.x }], { useNativeDriver: false });
			const panX = Math.min(Math.max(0.01, this.pan.x._value), this.state.componentWidth - DIAMETER);
			moveSlider(evt, gestureState);
			this.setState({ panX });
		},
		onPanResponderRelease: evt => {
			if (this.props.disabled) {
				return;
			}
			const { locationY } = evt.nativeEvent;
			const fingerInButton = locationY >= 0 && locationY <= DIAMETER;
			const actionComplete = this.pan.x._value >= this.state.componentWidth - DIAMETER;
			if (fingerInButton && actionComplete) {
				this.onComplete();
				return;
			} else if (actionComplete && !fingerInButton) {
				this.pan.x.setValue(this.state.componentWidth - DIAMETER);
			}
			this.reset();
		}
	});

	/* Reset the slider position to the start */
	reset = () => {
		if (this.state.panX !== 0.01) {
			Animated.timing(this.pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
		} else {
			this.pan.x.setValue(0);
		}
		this.setState({ panX: 0 }, this.shine);
	};

	/* Animate the background color from blue to green upon completion */
	startBackgroundColorAnimation = () => {
		Animated.timing(this.bgColor, {
			toValue: GREEN,
			duration: 250,
			useNativeDriver: false
		}).start(this.startBackgroundColorAnimation);
	};

	/* Restart the "shine" animation if it's allowed to */
	restartShine = () => {
		this.shineAnimating = false;
		if (!this.state.panX) {
			this.shine();
		}
	};

	/* Animate the shine across the track when slider is inactive */
	shine = () => {
		if (!this.shineAnimating) {
			this.shineAnimating = true;
			this.shineOffset.setValue(-GRADIENT_OFFSET);
			Animated.timing(this.shineOffset, {
				toValue: this.state.componentWidth * 2,
				duration: 2500,
				useNativeDriver: true
			}).start(this.restartShine);
		}
	};

	/* Action that's triggered when the slider reaches the end */
	onComplete = () => {
		this.startBackgroundColorAnimation();
		setTimeout(() => {
			this.setState({ isComplete: true });
			if (this.props.onComplete) {
				this.props.onComplete();
			}
		}, 800);
	};

	render = () => {
		const { incompleteText, completeText, disabled } = this.props;
		const trackWidth = (this.state.panX || -DIAMETER) + DIAMETER;
		return (
			<View
				style={[styles.root, { opacity: 1 - (+disabled || 0) / 3 }]}
				onLayout={e => {
					this.setState({ componentWidth: e.nativeEvent.layout.width }, this.shine);
				}}
			>
				<View style={styles.trackBack}>
					<SliderBg />
					{!disabled && (
						<Animated.View
							style={[styles.trackBackShineContainer, { transform: [{ translateX: this.shineOffset }] }]}
						>
							<SliderShine />
						</Animated.View>
					)}
					<Animated.View
						style={{
							opacity: Animated.subtract(
								new Animated.Value(1),
								Animated.divide(this.pan.x, new Animated.Value(this.state.componentWidth / 2 || 1))
							)
						}}
					>
						<Text style={styles.textBack}>{incompleteText}</Text>
					</Animated.View>
				</View>
				<View style={styles.trackFrontContainer}>
					<Animated.View
						style={[
							styles.trackFront,
							{ width: trackWidth || Animated.add(this.sliderWidth, this.pan.x) },
							{
								backgroundColor: this.bgColor.interpolate({
									inputRange: [BLUE, GREEN],
									outputRange: [colors.blue600, colors.success],
									useNativeDriver: false
								})
							}
						]}
					>
						<View style={[styles.textFrontContainer, { width: this.state.componentWidth }]}>
							<Text style={styles.textFront}>{completeText}</Text>
						</View>
						<Animated.View
							{...this.panResponder.panHandlers}
							style={[styles.slider, { opacity: Animated.subtract(new Animated.Value(1), this.bgColor) }]}
						/>
					</Animated.View>
				</View>
			</View>
		);
	};
}

export default SliderButton;
