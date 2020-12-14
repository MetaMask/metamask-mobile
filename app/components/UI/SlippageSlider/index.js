import React from 'react';
import { View, Animated, PanResponder, StyleSheet, Text, Image, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';

/* eslint-disable import/no-commonjs */
const SlippageSliderBgImg = require('../../../images/slippage-slider-bg.png');
/* eslint-enable import/no-commonjs */

const WINDOW_WIDTH = Dimensions.get('window').width;
const DIAMETER = 30;
const GRADIENT_OFFSET = DIAMETER / 2 - 4;
const TRACK_PADDING = 2;
const TICK_DIAMETER = 5;
const BAR_HEIGHT = TICK_DIAMETER + 2 * TRACK_PADDING;
const TOOLTIP_HEIGHT = 29;
const TAIL_WIDTH = 10;
const COMPONENT_HEIGHT = DIAMETER + TOOLTIP_HEIGHT + 10;

const styles = StyleSheet.create({
	root: {
		position: 'relative',
		justifyContent: 'center',
		height: COMPONENT_HEIGHT,
		backgroundColor: colors.transparent
	},
	slider: {
		position: 'absolute',
		width: DIAMETER,
		height: DIAMETER,
		borderRadius: DIAMETER,
		borderWidth: 1,
		borderColor: colors.white,
		bottom: 0
	},
	trackBackContainer: {
		position: 'absolute',
		padding: DIAMETER / 2 - 2 * TRACK_PADDING,
		bottom: 0
	},
	trackBack: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		height: TICK_DIAMETER + 2 * TRACK_PADDING,
		backgroundColor: colors.blue000,
		borderRadius: TICK_DIAMETER + 2 * TRACK_PADDING,
		borderWidth: 2,
		borderColor: colors.blue000
	},
	tick: {
		height: TICK_DIAMETER,
		width: TICK_DIAMETER,
		borderRadius: TICK_DIAMETER,
		backgroundColor: colors.spinnerColor,
		opacity: 0.5
	},
	trackFront: {
		position: 'absolute',
		padding: GRADIENT_OFFSET,
		overflow: 'hidden',
		bottom: 0
	},
	tooltipContainer: {
		position: 'absolute',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.grey700,
		padding: 5,
		borderRadius: 8,
		minHeight: TOOLTIP_HEIGHT,
		minWidth: 40,
		top: 0
	},
	tooltipTail: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: -5,
		width: TAIL_WIDTH,
		height: TAIL_WIDTH,
		backgroundColor: colors.grey700,
		transform: [{ rotate: '45deg' }]
	},
	tooltipText: {
		...fontStyles.normal,
		color: colors.white,
		fontSize: 12
	}
});

const SlippageSliderBg = () => <Image style={styles.trackFrontGradient} source={SlippageSliderBgImg} />;

const SlippageSlider = React.memo(({ range, increment, onChange, defaultValue, formatTooltipText }) => {
	/* Reusable/truncated references to the range prop values */
	const [r0, r1] = range;
	const fullRange = React.useMemo(() => r1 - r0, [r0, r1]);

	/* State */
	const [trackWidth, setTrackWidth] = React.useState(0);
	const [tooltipWidth, setTooltipWidth] = React.useState(0);
	const [componentWidth, setComponentWidth] = React.useState(0);
	const [panX, setPanX] = React.useState(0);
	const [value, setValue] = React.useState(defaultValue || r0);

	/* Slider action handlers */
	const panResponder = PanResponder.create({
		onMoveShouldSetPanResponder: () => true,
		/**
		 * When the slider is being dragged, this handler will figure out which tick
		 * it should snap to
		 */
		onPanResponderMove: (evt, gestureState) => {
			const margins = (WINDOW_WIDTH - trackWidth) / 2;
			const maxTrackWidth = trackWidth;
			const progressPercent = (gestureState.moveX - margins) / maxTrackWidth;
			const progress = progressPercent * fullRange + r0;

			for (let _value = r0; _value <= r1; _value += increment) {
				const incrementDiff = Math.abs(_value - progress);
				if (incrementDiff < 0.2) {
					const rangeOffsetRatio = (_value - r0) / fullRange;
					const moved = (trackWidth - GRADIENT_OFFSET) * rangeOffsetRatio;
					const _panX = Math.min(Math.max(0, moved), trackWidth - BAR_HEIGHT);
					setPanX(_panX);
					setValue(_value);
				}
			}
		},
		onPanResponderRelease: () => {
			if (onChange) {
				onChange(value);
			}
		}
	});

	/* Used to change the color of the slider from blue to red depending on value */
	const sliderColor = React.useMemo(() => new Animated.Value(r0), [r0]);
	React.useEffect(() => {
		sliderColor.setValue(value);
	}, [sliderColor, value]);

	return (
		<View
			style={styles.root}
			onLayout={e => {
				setComponentWidth(e.nativeEvent.layout.width);
			}}
		>
			<View style={[styles.trackBackContainer, { width: componentWidth }]}>
				<View
					style={styles.trackBack}
					onLayout={e => {
						setTrackWidth(e.nativeEvent.layout.width);
					}}
				>
					{new Array(fullRange / increment + 1).fill(0).map((unused, i) => (
						<View key={i} style={styles.tick} />
					))}
				</View>
			</View>
			<Animated.View style={[styles.trackFront, { width: panX }]}>
				<SlippageSliderBg />
			</Animated.View>
			<Animated.View
				style={[styles.tooltipContainer, { left: panX - (tooltipWidth - DIAMETER) / 2 }]}
				onLayout={e => {
					setTooltipWidth(e.nativeEvent.layout.width);
				}}
			>
				<View style={[styles.tooltipTail, { left: (tooltipWidth - 10) / 2 }]} />
				<Text style={styles.tooltipText}>{formatTooltipText(value)}%</Text>
			</Animated.View>
			<Animated.View
				{...panResponder.panHandlers}
				style={[
					styles.slider,
					{ left: panX },
					{
						backgroundColor: sliderColor.interpolate({
							inputRange: [r0, r1],
							outputRange: [colors.spinnerColor, colors.red],
							useNativeDriver: true
						})
					}
				]}
			/>
		</View>
	);
});

SlippageSlider.defaultProps = {
	increment: 1,
	onChange: value => undefined,
	formatTooltipText: text => text
};

SlippageSlider.propTypes = {
	/**
	 * Range of the slider
	 */
	range: PropTypes.arrayOf(PropTypes.number),
	/**
	 * The increments between the range that are selectable
	 */
	increment: PropTypes.number,
	/**
	 * Default value for the slider
	 */
	defaultValue: PropTypes.number,
	/**
	 * Action to execute when value changes
	 */
	onChange: PropTypes.func,
	/**
	 * Function to format/compose the text in the tooltip
	 */
	formatTooltipText: PropTypes.func
};

export default SlippageSlider;
