import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import PropTypes from 'prop-types';

const TIME = 3900; // 3900/6 = 650 for each

const FadeAnimationView = ({
	children,
	style,
	animationTime,
	valueToWatch,
	onAnimationStart,
	onAnimationEnd,
	canAnimate
}) => {
	const fadeAnim = useRef(new Animated.Value(1)).current; // Initial value for opacity: 1
	const time = (TIME || animationTime) / 6;
	const [value, setValue] = useState(valueToWatch);
	const [lastChildren, setLastChildren] = useState(children);
	const [isAnimating, setIsAnimating] = useState(false);

	const animationEnded = useCallback(() => {
		onAnimationEnd?.();
		setValue(valueToWatch);
		setLastChildren(children);
		setIsAnimating(false);
	}, [children, onAnimationEnd, valueToWatch]);

	const animationStarted = useCallback(() => {
		onAnimationStart?.();
	}, [onAnimationStart]);

	const animate = useCallback(() => {
		animationStarted();
		Animated.sequence([
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: time,
				useNativeDriver: true
			}),
			Animated.timing(fadeAnim, {
				toValue: 0.8,
				duration: time,
				useNativeDriver: true
			}),
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: time,
				useNativeDriver: true
			}),
			Animated.timing(fadeAnim, {
				toValue: 0.8,
				duration: time,
				useNativeDriver: true
			}),
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: time,
				useNativeDriver: true
			}),
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: time,
				useNativeDriver: true
			})
		]).start(() => {
			animationEnded();
		});
	}, [animationEnded, animationStarted, fadeAnim, time]);

	useEffect(() => {
		if (!value) {
			setValue(valueToWatch);
			return;
		}
		if (!isAnimating) {
			if (canAnimate && valueToWatch && value && value !== valueToWatch) {
				animate();
				setIsAnimating(true);
				setValue(valueToWatch);
				return;
			}
			setLastChildren(children);
		}
	}, [animate, canAnimate, children, isAnimating, value, valueToWatch]);

	return (
		<Animated.View // Special animatable View
			style={{
				...style,
				opacity: fadeAnim // Bind opacity to animated value
			}}
			pointerEvents={isAnimating ? 'none' : null}
		>
			{isAnimating ? lastChildren : children}
		</Animated.View>
	);
};

FadeAnimationView.propTypes = {
	children: PropTypes.oneOfType([PropTypes.object, PropTypes.node]),
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
	animationTime: PropTypes.number,
	valueToWatch: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	onAnimationStart: PropTypes.func,
	onAnimationEnd: PropTypes.func,
	canAnimate: PropTypes.bool
};

export default FadeAnimationView;
