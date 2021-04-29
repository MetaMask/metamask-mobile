import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Video from 'react-native-video';
import PropTypes from 'prop-types';
import {
	TouchableWithoutFeedback,
	TouchableHighlight,
	PanResponder,
	StyleSheet,
	Animated,
	SafeAreaView,
	Easing,
	Image,
	View,
	Text
} from 'react-native';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { colors } from '../../../styles/common';

const styles = {
	player: StyleSheet.create({
		container: {
			overflow: 'hidden',
			flex: 1,
			alignSelf: 'stretch',
			justifyContent: 'space-between'
		},
		video: {
			overflow: 'hidden',
			position: 'absolute',
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		}
	}),
	error: StyleSheet.create({
		container: {
			position: 'absolute',
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
			justifyContent: 'center',
			alignItems: 'center'
		},
		icon: {
			marginBottom: 16
		},
		text: {}
	}),
	loader: StyleSheet.create({
		container: {
			position: 'absolute',
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
			alignItems: 'center',
			justifyContent: 'center'
		}
	}),
	controls: StyleSheet.create({
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			height: null,
			width: null
		},
		column: {
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'space-between',
			height: null,
			width: null
		},
		vignette: {
			resizeMode: 'stretch'
		},
		control: {
			padding: 16
		},
		text: {
			fontSize: 14,
			textAlign: 'center'
		},
		pullRight: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center'
		},
		top: {
			flex: 1,
			alignItems: 'stretch',
			justifyContent: 'flex-start'
		},
		bottom: {
			alignItems: 'stretch',
			flex: 2,
			justifyContent: 'flex-end'
		},
		topControlGroup: {
			alignSelf: 'stretch',
			alignItems: 'center',
			justifyContent: 'space-between',
			flexDirection: 'row',
			width: null,
			margin: 12,
			marginBottom: 18
		},
		bottomControlGroup: {
			alignSelf: 'stretch',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginLeft: 12,
			marginRight: 12,
			marginBottom: 0
		},
		fullscreen: {
			flexDirection: 'row'
		},
		playPause: {
			position: 'relative',
			width: 80,
			zIndex: 0
		},
		timer: {
			width: 80
		},
		timerText: {
			fontSize: 11,
			textAlign: 'right'
		},
		toggleIcon: {
			width: 25,
			height: 25
		}
	}),
	seekbar: StyleSheet.create({
		// eslint-disable-next-line react-native/no-unused-styles
		container: {
			alignSelf: 'stretch',
			height: 28,
			marginLeft: 20,
			marginRight: 20
		},
		// eslint-disable-next-line react-native/no-unused-styles
		track: {
			height: 1,
			position: 'relative',
			top: 14,
			width: '100%'
		},
		// eslint-disable-next-line react-native/no-unused-styles
		fill: {
			height: 1,
			width: '100%'
		},
		// eslint-disable-next-line react-native/no-unused-styles
		handle: {
			position: 'absolute',
			marginLeft: -7,
			height: 28,
			width: 28
		},
		// eslint-disable-next-line react-native/no-unused-styles
		circle: {
			borderRadius: 12,
			position: 'relative',
			top: 8,
			left: 8,
			height: 12,
			width: 12
		}
	}),
	actionButton: { width: 50, backgroundColor: colors.red },
	actionSeeker: { flex: 1 }
};

export default function VideoPlayer({
	toggleResizeModeOnFullscreen,
	controlAnimationTiming,
	doubleTapTime,
	onEnd,
	onEnterFullscreen,
	onShowControls,
	onPause,
	onPlay,
	onExitFullscreen,
	controlTimeout,
	tapAnywhereToPause,
	style,
	disableFullscreen,
	source
}) {
	const [paused, setPaused] = useState(false);
	const [muted, setMuted] = useState(true);
	const [seekerFillWidth, setSeekerFillWidth] = useState(0);
	const [seekerPosition, setSeekerPosition] = useState(0);
	const [seekerOffset, setSeekerOffset] = useState(0);
	const [seeking, setSeeking] = useState(false);
	const [originallyPaused, setOriginallyPaused] = useState(false);
	const [scrubbing, setScrubbing] = useState(false);
	const [loading, setLoading] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [error] = useState(false);
	const [duration, setDuration] = useState(0);
	const [showControls, setShowControls] = useState(true);
	const [seekerWidth, setSeekerWidth] = useState(0);

	const videoRef = useRef();

	/**
	 * Player information
	 */
	const player = {
		controlTimeoutDelay: controlTimeout || 15000,
		controlTimeout: null,
		tapActionTimeout: null,
		scrubbingTimeStep: scrubbing || 0,
		tapAnywhereToPause
	};

	const animations = {
		bottomControl: {
			marginBottom: new Animated.Value(0),
			opacity: new Animated.Value(1)
		},
		topControl: {
			marginTop: new Animated.Value(0),
			opacity: new Animated.Value(1)
		},
		video: {
			opacity: new Animated.Value(1)
		},
		loader: {
			rotate: new Animated.Value(0),
			MAX_VALUE: 360
		}
	};

	const hideControlAnimation = useCallback(() => {
		Animated.parallel([
			Animated.timing(animations.topControl.opacity, {
				toValue: 0,
				duration: controlAnimationTiming,
				useNativeDriver: false
			}),
			Animated.timing(animations.topControl.marginTop, {
				toValue: -100,
				duration: controlAnimationTiming,
				useNativeDriver: false
			}),
			Animated.timing(animations.bottomControl.opacity, {
				toValue: 0,
				duration: controlAnimationTiming,
				useNativeDriver: false
			}),
			Animated.timing(animations.bottomControl.marginBottom, {
				toValue: -100,
				duration: controlAnimationTiming,
				useNativeDriver: false
			})
		]).start();
	}, [
		controlAnimationTiming,
		animations.bottomControl.opacity,
		animations.bottomControl.marginBottom,
		animations.topControl.opacity,
		animations.topControl.marginTop
	]);

	const showControlAnimation = useCallback(() => {
		Animated.parallel([
			Animated.timing(animations.topControl.opacity, {
				toValue: 1,
				useNativeDriver: false,
				duration: controlAnimationTiming
			}),
			Animated.timing(animations.topControl.marginTop, {
				toValue: 0,
				useNativeDriver: false,
				duration: controlAnimationTiming
			}),
			Animated.timing(animations.bottomControl.opacity, {
				toValue: 1,
				useNativeDriver: false,
				duration: controlAnimationTiming
			}),
			Animated.timing(animations.bottomControl.marginBottom, {
				toValue: 0,
				useNativeDriver: false,
				duration: controlAnimationTiming
			})
		]).start();
	}, [
		controlAnimationTiming,
		animations.bottomControl.opacity,
		animations.bottomControl.marginBottom,
		animations.topControl.opacity,
		animations.topControl.marginTop
	]);

	const hideControls = useCallback(() => {
		hideControlAnimation();
		setShowControls(false);
	}, [hideControlAnimation]);

	const setControlTimeout = useCallback(() => {
		player.controlTimeout = setTimeout(() => {
			hideControls();
		}, player.controlTimeoutDelay);
	}, [player.controlTimeout, player.controlTimeoutDelay, hideControls]);

	const clearControlTimeout = useCallback(() => {
		clearTimeout(player.controlTimeout);
	}, [player.controlTimeout]);

	const resetControlTimeout = () => {
		clearControlTimeout();
		setControlTimeout();
	};

	const toggleControls = () => {
		if (showControls) {
			showControlAnimation();
			setControlTimeout();
		} else {
			hideControlAnimation();
			clearControlTimeout();
		}
		setShowControls(!showControls);
	};

	const toggleFullscreen = () => null;

	const togglePlayPause = () => {
		if (paused) {
			typeof onPause === 'function' && onPause();
		} else {
			typeof onPlay === 'function' && onPlay();
		}
		setPaused(!paused);
	};

	const toggleMuted = () => setMuted(!muted);

	const constrainToSeekerMinMax = useCallback(
		(val = 0) => {
			if (val <= 0) {
				return 0;
			} else if (val >= seekerWidth) {
				return seekerWidth;
			}
			return val;
		},
		[seekerWidth]
	);

	const updateSeekerPosition = useCallback(
		(position = 0) => {
			position = constrainToSeekerMinMax(position);
			if (!seeking) {
				setSeekerOffset(position);
			}
			setSeekerFillWidth(position);
			setSeekerPosition(position);
		},
		[constrainToSeekerMinMax, seeking]
	);

	const loadAnimation = () => {
		if (loading) {
			Animated.sequence([
				Animated.timing(animations.loader.rotate, {
					toValue: animations.loader.MAX_VALUE,
					duration: 1500,
					easing: Easing.linear,
					useNativeDriver: false
				}),
				Animated.timing(animations.loader.rotate, {
					toValue: 0,
					duration: 0,
					easing: Easing.linear,
					useNativeDriver: false
				})
			]).start(loadAnimation);
		}
	};

	const onLoadStart = () => {
		loadAnimation();
		setLoading(true);
	};

	const onLoad = (data = {}) => {
		setDuration(data.duration);
		setLoading(false);

		if (showControls) {
			setControlTimeout();
		}
	};

	const onProgress = data => {
		if (!scrubbing) {
			if (!seeking) {
				const position = data.currentTime / data.playableDuration;
				updateSeekerPosition(position * seekerWidth);
			}
			setCurrentTime(data.currentTime);
		}
	};

	const onSeek = (data = {}) => {
		if (scrubbing) {
			if (!seeking) {
				setControlTimeout();
				setPaused(originallyPaused);
			}
			setScrubbing(false);
			setCurrentTime(data.currentTime);
		}
	};

	// const onError = () => {
	// 	setError(true)
	// 	setLoading(false)
	// };

	const onScreenTouch = () => {
		if (player.tapActionTimeout) {
			clearTimeout(player.tapActionTimeout);
			player.tapActionTimeout = 0;
			toggleFullscreen();
			if (showControls) {
				resetControlTimeout();
			}
		} else {
			player.tapActionTimeout = setTimeout(() => {
				if (player.tapAnywhereToPause && showControls) {
					togglePlayPause();
					resetControlTimeout();
				} else {
					toggleControls();
				}
				player.tapActionTimeout = 0;
			}, doubleTapTime);
		}
	};

	// const calculateSeekerPosition = () => {
	// 	const percent = currentTime / duration;
	// 	return seekerWidth * percent;
	// };

	const calculateTimeFromSeekerPosition = useCallback(() => {
		const percent = seekerPosition / seekerWidth;
		return duration * percent;
	}, [seekerPosition, seekerWidth, duration]);

	const seekTo = (time = 0) => {
		videoRef.current.seek(time);
		setCurrentTime(time);
	};

	const seekPanResponder = useMemo(
		() =>
			PanResponder.create({
				// Ask to be the responder.
				onStartShouldSetPanResponder: (evt, gestureState) => true,
				onMoveShouldSetPanResponder: (evt, gestureState) => true,

				/**
				 * When we start the pan tell the machine that we're
				 * seeking. This stops it from updating the seekbar
				 * position in the onProgress listener.
				 */
				onPanResponderGrant: (evt, gestureState) => {
					clearControlTimeout();
					const position = evt.nativeEvent.locationX;
					updateSeekerPosition(position);
					if (player.scrubbingTimeStep > 0) {
						setPaused(true);
					} else {
						setPaused(false);
					}
					setSeeking(true);
					setOriginallyPaused(paused);
					setScrubbing(false);
				},

				/**
				 * When panning, update the seekbar position, duh.
				 */
				onPanResponderMove: (evt, gestureState) => {
					const position = seekerOffset + gestureState.dx;
					updateSeekerPosition(position);

					if (player.scrubbingTimeStep > 0 && !loading && !scrubbing) {
						const time = calculateTimeFromSeekerPosition();
						const timeDifference = Math.abs(currentTime - time) * 1000;

						if (time < duration && timeDifference >= player.scrubbingTimeStep) {
							setScrubbing(true);
							setTimeout(() => {
								videoRef.current.seek(time, player.scrubbingTimeStep);
							}, 1);
						}
					}
				},

				/**
				 * On release we update the time and seek to it in the video.
				 * If you seek to the end of the video we fire the
				 * onEnd callback
				 */
				onPanResponderRelease: (evt, gestureState) => {
					const time = calculateTimeFromSeekerPosition();
					if (time >= duration && !loading) {
						setPaused(true);
						// onEnd();
					} else if (scrubbing) {
						setSeeking(false);
					} else {
						seekTo(time);
						setControlTimeout();
						setPaused(originallyPaused);
						setSeeking(false);
					}
				}
			}),
		[
			clearControlTimeout,
			updateSeekerPosition,
			calculateTimeFromSeekerPosition,
			currentTime,
			duration,
			loading,
			originallyPaused,
			paused,
			player.scrubbingTimeStep,
			scrubbing,
			seekerOffset,
			setControlTimeout
		]
	);

	useEffect(() => clearControlTimeout(), [clearControlTimeout]);

	const renderControl = (children, callback, style = {}) => (
		<TouchableHighlight
			underlayColor="transparent"
			activeOpacity={0.3}
			onPress={() => {
				resetControlTimeout();
				callback();
			}}
			style={[styles.controls.control, style]}
		>
			{children}
		</TouchableHighlight>
	);

	const renderNullControl = () => <View style={[styles.controls.control]} />;

	const renderFullscreen = () =>
		renderControl(<FontAwesome name={'expand'} />, toggleFullscreen, styles.controls.fullscreen);

	const renderMuteUnmuteControl = () => {
		const source = muted === true ? 'volume-off' : 'volume-up';
		return renderControl(
			<FA5Icon style={styles.controls.toggleIcon} size={20} name={source} />,
			toggleMuted,
			styles.controls.playPause
		);
	};

	const renderSeekbar = () => (
		<View style={styles.seekbar.container} collapsable={false} {...seekPanResponder.panHandlers}>
			<View
				style={styles.seekbar.track}
				onLayout={event => setSeekerWidth(event.nativeEvent.layout.width)}
				pointerEvents={'none'}
			>
				<View
					style={[
						styles.seekbar.fill,
						{
							width: seekerFillWidth,
							backgroundColor: colors.white
						}
					]}
					pointerEvents={'none'}
				/>
			</View>
			<View style={[styles.seekbar.handle, { left: seekerPosition }]} pointerEvents={'none'}>
				<View style={[styles.seekbar.circle, { backgroundColor: colors.white }]} pointerEvents={'none'} />
			</View>
		</View>
	);

	const renderPlayPause = () => {
		const source = paused === true ? 'play' : 'pause';
		return renderControl(
			<FA5Icon styles={styles.controls.toggleIcon} size={20} name={source} />,
			togglePlayPause,
			styles.controls.playPause
		);
	};

	const renderLoader = () => {
		if (loading) {
			return (
				<View style={styles.loader.container}>
					<Animated.Image
						style={[
							styles.loader.icon,
							{
								transform: [
									{
										rotate: animations.loader.rotate.interpolate({
											inputRange: [0, 360],
											outputRange: ['0deg', '360deg']
										})
									}
								]
							}
						]}
					/>
				</View>
			);
		}
		return null;
	};

	const renderError = () => {
		if (error) {
			return (
				<View style={styles.error.container}>
					<Image style={styles.error.icon} />
					<Text style={styles.error.text}>Video unavailable</Text>
				</View>
			);
		}
		return null;
	};

	const renderTopControls = () => {
		const fullscreenControl = disableFullscreen ? renderNullControl() : renderFullscreen();

		return (
			<Animated.View
				style={[
					styles.controls.top,
					{
						opacity: animations.topControl.opacity,
						marginTop: animations.topControl.marginTop
					}
				]}
			>
				<View
					style={[styles.controls.column, { backgroundColor: colors.grey400 }]}
					imageStyle={[styles.controls.vignette]}
				>
					<SafeAreaView style={styles.controls.topControlGroup}>
						<View style={styles.controls.pullRight}>{fullscreenControl}</View>
					</SafeAreaView>
				</View>
			</Animated.View>
		);
	};

	const renderBottomControls = () => {
		const seekbarControl = renderSeekbar();
		const playPauseControl = renderPlayPause();
		const muteUnmuteControl = renderMuteUnmuteControl();

		return (
			<Animated.View
				style={[
					styles.controls.bottom,
					{
						opacity: animations.bottomControl.opacity,
						marginBottom: animations.bottomControl.marginBottom
					}
				]}
			>
				<View
					style={[styles.controls.column, { backgroundColor: colors.grey400 }]}
					imageStyle={[styles.controls.vignette]}
				>
					<SafeAreaView style={[styles.controls.row, styles.controls.bottomControlGroup]}>
						<View style={styles.actionButton}>{playPauseControl}</View>
						<View style={[styles.actionSeeker, styles.actionButton]}>{seekbarControl}</View>
						<View style={styles.actionButton}>{muteUnmuteControl}</View>
					</SafeAreaView>
				</View>
			</Animated.View>
		);
	};

	return (
		<TouchableWithoutFeedback onPress={onScreenTouch} style={[styles.player.container]}>
			<View style={[styles.player.container]}>
				<Video
					ref={videoRef}
					paused={paused}
					muted={muted}
					onLoad={onLoad}
					onSeek={onSeek}
					onLoadStart={onLoadStart}
					onProgress={onProgress}
					style={[styles.player.video]}
					source={source}
					repeat
				/>
				{renderError()}
				{renderLoader()}
				{renderTopControls()}
				{renderBottomControls()}
			</View>
		</TouchableWithoutFeedback>
	);
}

VideoPlayer.propTypes = {
	toggleResizeModeOnFullscreen: PropTypes.bool,
	controlAnimationTiming: PropTypes.number,
	doubleTapTime: PropTypes.number,
	onEnd: PropTypes.func,
	onEnterFullscreen: PropTypes.func,
	onShowControls: PropTypes.func,
	onPause: PropTypes.func,
	onPlay: PropTypes.func,
	onExitFullscreen: PropTypes.func,
	controlTimeout: PropTypes.func,
	tapAnywhereToPause: PropTypes.bool,
	style: PropTypes.object,
	disableFullscreen: PropTypes.bool,
	source: PropTypes.object
};

VideoPlayer.defaultProps = {
	toggleResizeModeOnFullscreen: true,
	controlAnimationTiming: 500,
	doubleTapTime: 130
};
