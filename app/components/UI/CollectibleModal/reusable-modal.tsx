import React, { useEffect, ReactNode, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, Dimensions, StyleProp } from 'react-native';
import Animated, {
	call,
	eq,
	Easing,
	not,
	block,
	cond,
	clockRunning,
	Value,
	interpolate,
	useCode,
	set
} from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { onGestureEvent, withSpring, clamp, timing, spring } from 'react-native-redash';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const screenHeight = Dimensions.get('window').height;

type Actions = {
	dismissActionSheet: () => void;
};

type Props = {
	ref?: React.Ref<any>;
	style?: StyleProp<ViewStyle>;
	children?: ReactNode;
	onDismiss?: () => void;
};

const ReusableModal = forwardRef<Actions, Props>((props, ref) => {
	const { style, children, onDismiss } = props;
	const topOffset = 0;
	const bottomOffset = screenHeight;
	const safeAreaInsets = useSafeAreaInsets();

	// Animation config
	const animationConfig: Omit<Animated.SpringConfig, 'toValue'> = {
		damping: 100,
		overshootClamping: false,
		restSpeedThreshold: 5,
		restDisplacementThreshold: 5,
		stiffness: 800,
		mass: 6
	};

	// Set up gesture handler
	const offset = useMemo(() => new Value(bottomOffset), []);
	const state = useMemo(() => new Value(State.UNDETERMINED), []);
	const velocityY = useMemo(() => new Value(0), []);
	const translationY = useMemo(() => new Value(0), []);
	const gestureHandler = useMemo(() => onGestureEvent({ translationY, state, velocityY }), []);
	const clock = useMemo(() => new Animated.Clock(), []);
	const translateY = useMemo(
		() =>
			clamp(
				withSpring({
					onSnap: val => {
						const offset = val[0];
						if (offset == bottomOffset) {
							// TODO: Use optional chaining once prettier is fixed
							onDismiss && onDismiss();
						}
					},
					state,
					velocity: velocityY,
					offset,
					value: translationY,
					snapPoints: [topOffset, bottomOffset],
					config: animationConfig
				}),
				topOffset,
				bottomOffset
			),
		[bottomOffset, topOffset, translationY, velocityY, onDismiss]
	);

	// Programatically trigger hiding and showing
	const triggerShowActionSheet: Animated.Value<0 | 1> = useMemo(() => new Value(0), []);
	const triggerDismissActionSheet: Animated.Value<0 | 1> = useMemo(() => new Value(0), []);

	// Dismiss overlay
	const dismissOverlay = useCallback(() => {
		triggerDismissActionSheet.setValue(1);
	}, [triggerDismissActionSheet]);

	// Define animated styles
	const animatedStyles: StyleSheet.NamedStyles<any> = useMemo(() => {
		return {
			overlayBackground: {
				opacity: interpolate(translateY, {
					inputRange: [topOffset, bottomOffset],
					outputRange: [1, 0]
				}) as any
			},
			overlayBackgroundTouchable: {
				...StyleSheet.absoluteFillObject,
				transform: [
					{
						translateY: interpolate(translateY, {
							inputRange: [0, 1],
							outputRange: [0, bottomOffset]
						}) as any
					}
				]
			},
			modal: {
				transform: [{ translateY } as any],
				paddingBottom: safeAreaInsets.bottom,
				flex: 1
			}
		};
	}, [topOffset, bottomOffset, translateY, safeAreaInsets]);

	// Declarative logic that animates overlay
	useCode(
		() =>
			block([
				// Animate IN overlay
				cond(eq(triggerShowActionSheet, new Value(1)), [
					set(
						offset,
						spring({
							config: animationConfig,
							clock,
							from: offset,
							to: topOffset
						})
					),
					// Reset value that toggles animating in overlay
					cond(not(clockRunning(clock)), block([set(triggerShowActionSheet, 0)]))
				]),
				// Animate OUT overlay
				cond(eq(triggerDismissActionSheet, new Value(1)), [
					set(
						offset,
						timing({
							clock,
							from: offset,
							easing: Easing.ease,
							duration: 200,
							to: bottomOffset
						})
					),
					// Dismiss overlay after animating out
					cond(
						not(clockRunning(clock)),
						block([
							call([], () => {
								onDismiss?.();
							}),
							set(triggerDismissActionSheet, 0)
						])
					)
				])
			]),
		[]
	);

	// Show action sheet
	useEffect(() => {
		triggerShowActionSheet.setValue(1);
	}, []);

	// Expose actions for external components
	useImperativeHandle(ref, () => ({
		dismissActionSheet: dismissOverlay
	}));

	const renderOverlay = useCallback(() => {
		return <Animated.View style={[styles.overlayBackground, animatedStyles.overlayBackground]} />;
	}, [animatedStyles]);

	const renderContent = useCallback(() => {
		return (
			<PanGestureHandler {...gestureHandler}>
				<Animated.View style={[animatedStyles.modal, style]}>
					<Animated.View style={animatedStyles.overlayBackgroundTouchable}>
						<TouchableOpacity style={styles.fill} onPress={dismissOverlay} />
					</Animated.View>
					{children}
				</Animated.View>
			</PanGestureHandler>
		);
	}, [gestureHandler, animatedStyles, style, children, dismissOverlay]);

	return (
		<View style={styles.container}>
			{renderOverlay()}
			{renderContent()}
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	overlayBackground: {
		backgroundColor: 'rgba(0,0,0,0.7)',
		...StyleSheet.absoluteFillObject
	},
	fill: {
		flex: 1
	}
});

export default ReusableModal;
