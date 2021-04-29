import React, { PureComponent } from 'react';
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

export default class VideoPlayer extends PureComponent {
	static propTypes = {
		toggleResizeModeOnFullscreen: PropTypes.bool,
		controlAnimationTiming: PropTypes.number,
		doubleTapTime: PropTypes.number,
		resizeMode: PropTypes.string,
		isFullScreen: PropTypes.bool,
		onError: PropTypes.func,
		onEnd: PropTypes.func,
		onEnterFullscreen: PropTypes.func,
		onShowControls: PropTypes.func,
		onHideControls: PropTypes.func,
		onPause: PropTypes.func,
		onPlay: PropTypes.func,
		onExitFullscreen: PropTypes.func,
		onLoadStart: PropTypes.func,
		onLoad: PropTypes.func,
		controlTimeout: PropTypes.func,
		scrubbing: PropTypes.bool,
		tapAnywhereToPause: PropTypes.bool,
		style: PropTypes.object,
		disableFullscreen: PropTypes.bool,
		source: PropTypes.string
	};

	static defaultProps = {
		toggleResizeModeOnFullscreen: true,
		controlAnimationTiming: 500,
		doubleTapTime: 130,
		resizeMode: 'contain',
		isFullscreen: false
	};

	state = {
		// Video
		resizeMode: this.props.resizeMode,
		paused: false,
		muted: true,
		// Controls
		isFullscreen: this.props.isFullScreen || this.props.resizeMode === 'cover' || false,
		seekerFillWidth: 0,
		seekerPosition: 0,
		seekerOffset: 0,
		seeking: false,
		originallyPaused: false,
		scrubbing: false,
		loading: false,
		currentTime: 0,
		error: false,
		duration: 0
	};

	/**
	 * Player information
	 */
	player = {
		controlTimeoutDelay: this.props.controlTimeout || 15000,
		seekPanResponder: PanResponder,
		controlTimeout: null,
		tapActionTimeout: null,
		seekerWidth: 0,
		ref: Video,
		scrubbingTimeStep: this.props.scrubbing || 0,
		tapAnywhereToPause: this.props.tapAnywhereToPause
	};

	animations = {
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

	onLoadStart = args => {
		this.loadAnimation();
		this.setState({ loading: true });

		if (typeof this.props.onLoadStart === 'function') {
			this.props.onLoadStart(args);
		}
	};

	onLoad = (data = {}) => {
		this.setState({ duration: data.playableDuration, loading: false });

		if (this.state.showControls) {
			this.setControlTimeout();
		}

		if (typeof this.props.onLoad === 'function') {
			this.props.onLoad(data);
		}
	};

	onProgress = data => {
		const { scrubbing, seeking } = this.state;
		if (!scrubbing) {
			if (!seeking) {
				const position = data.currentTime / data.playableDuration;
				this.setSeekerPosition(position * this.player.seekerWidth);
			}
			this.setState({ currentTime: data.currentTime });
		}
	};

	onSeek = (data = {}) => {
		if (this.state.scrubbing) {
			if (!this.state.seeking) {
				this.setControlTimeout();
				this.setState({ scrubbing: false, currentTime: data.currentTime, paused: this.state.originallyPaused });
			} else {
				this.setState({ scrubbing: false, currentTime: data.currentTime });
			}
		}
	};

	onEnd = () => null;

	onError = () => {
		this.setState({ error: true, loading: false });
	};

	onScreenTouch = () => {
		if (this.player.tapActionTimeout) {
			clearTimeout(this.player.tapActionTimeout);
			this.player.tapActionTimeout = 0;
			this.toggleFullscreen();
			const state = this.state;
			if (state.showControls) {
				this.resetControlTimeout();
			}
		} else {
			this.player.tapActionTimeout = setTimeout(() => {
				const state = this.state;
				if (this.player.tapAnywhereToPause && state.showControls) {
					this.togglePlayPause();
					this.resetControlTimeout();
				} else {
					this.toggleControls();
				}
				this.player.tapActionTimeout = 0;
			}, this.props.doubleTapTime);
		}
	};

	setControlTimeout = () => {
		this.player.controlTimeout = setTimeout(() => {
			this.hideControls();
		}, this.player.controlTimeoutDelay);
	};

	clearControlTimeout = () => {
		clearTimeout(this.player.controlTimeout);
	};

	resetControlTimeout = () => {
		this.clearControlTimeout();
		this.setControlTimeout();
	};

	hideControlAnimation = () => {
		Animated.parallel([
			Animated.timing(this.animations.topControl.opacity, {
				toValue: 0,
				duration: this.props.controlAnimationTiming,
				useNativeDriver: false
			}),
			Animated.timing(this.animations.topControl.marginTop, {
				toValue: -100,
				duration: this.props.controlAnimationTiming,
				useNativeDriver: false
			}),
			Animated.timing(this.animations.bottomControl.opacity, {
				toValue: 0,
				duration: this.props.controlAnimationTiming,
				useNativeDriver: false
			}),
			Animated.timing(this.animations.bottomControl.marginBottom, {
				toValue: -100,
				duration: this.props.controlAnimationTiming,
				useNativeDriver: false
			})
		]).start();
	};

	showControlAnimation = () => {
		Animated.parallel([
			Animated.timing(this.animations.topControl.opacity, {
				toValue: 1,
				useNativeDriver: false,
				duration: this.props.controlAnimationTiming
			}),
			Animated.timing(this.animations.topControl.marginTop, {
				toValue: 0,
				useNativeDriver: false,
				duration: this.props.controlAnimationTiming
			}),
			Animated.timing(this.animations.bottomControl.opacity, {
				toValue: 1,
				useNativeDriver: false,
				duration: this.props.controlAnimationTiming
			}),
			Animated.timing(this.animations.bottomControl.marginBottom, {
				toValue: 0,
				useNativeDriver: false,
				duration: this.props.controlAnimationTiming
			})
		]).start();
	};

	loadAnimation = () => {
		if (this.state.loading) {
			Animated.sequence([
				Animated.timing(this.animations.loader.rotate, {
					toValue: this.animations.loader.MAX_VALUE,
					duration: 1500,
					easing: Easing.linear,
					useNativeDriver: false
				}),
				Animated.timing(this.animations.loader.rotate, {
					toValue: 0,
					duration: 0,
					easing: Easing.linear,
					useNativeDriver: false
				})
			]).start(this.loadAnimation);
		}
	};

	hideControls = () => {
		if (this.mounted) {
			this.hideControlAnimation();
			typeof this.onHideControls === 'function' && this.onHideControls();

			this.setState({ showControls: false });
		}
	};

	toggleControls = () => {
		if (this.state.showControls) {
			this.showControlAnimation();
			this.setControlTimeout();
			typeof this.onShowControls === 'function' && this.onShowControls();
		} else {
			this.hideControlAnimation();
			this.clearControlTimeout();
			typeof this.onHideControls === 'function' && this.onHideControls();
		}

		this.setState({ showControls: !this.state.showControls });
	};

	toggleFullscreen = () => {
		if (this.props.toggleResizeModeOnFullscreen) {
			//   state.resizeMode = this.state.isFullscreen === true ? 'cover' : 'contain';
		}

		if (this.state.isFullscreen) {
			typeof this.onEnterFullscreen === 'function' && this.onEnterFullscreen();
		} else {
			typeof this.onExitFullscreen === 'function' && this.onExitFullscreen();
		}

		// this.setState({isFullscreen: !this.state.isFullscreen});
	};

	togglePlayPause = () => {
		if (this.state.paused) {
			typeof this.onPause === 'function' && this.onPause();
		} else {
			typeof this.onPlay === 'function' && this.onPlay();
		}

		this.setState({ paused: !this.state.paused });
	};

	toggleMuted = () => {
		this.setState({ muted: !this.state.muted });
	};

	setSeekerPosition = (position = 0) => {
		position = this.constrainToSeekerMinMax(position);
		if (!this.state.seeking) {
			this.setState({ seekerFillWidth: position, seekerPosition: position, seekerOffset: position });
		} else {
			this.setState({ seekerFillWidth: position, seekerPosition: position });
		}
	};

	constrainToSeekerMinMax = (val = 0) => {
		if (val <= 0) {
			return 0;
		} else if (val >= this.player.seekerWidth) {
			return this.player.seekerWidth;
		}
		return val;
	};

	calculateSeekerPosition = () => {
		const percent = this.state.currentTime / this.state.duration;
		return this.player.seekerWidth * percent;
	};

	calculateTimeFromSeekerPosition = () => {
		const percent = this.state.seekerPosition / this.player.seekerWidth;
		return this.state.duration * percent;
	};

	seekTo = (time = 0) => {
		this.player.ref.seek(time);
		this.setState({ currentTime: time });
	};

	componentDidMount = () => {
		this.initSeekPanResponder();
		this.mounted = true;
	};

	componentWillUnmount = () => {
		this.mounted = false;
		this.clearControlTimeout();
	};

	initSeekPanResponder = () => {
		this.player.seekPanResponder = PanResponder.create({
			// Ask to be the responder.
			onStartShouldSetPanResponder: (evt, gestureState) => true,
			onMoveShouldSetPanResponder: (evt, gestureState) => true,

			/**
			 * When we start the pan tell the machine that we're
			 * seeking. This stops it from updating the seekbar
			 * position in the onProgress listener.
			 */
			onPanResponderGrant: (evt, gestureState) => {
				const state = this.state;
				this.clearControlTimeout();
				const position = evt.nativeEvent.locationX;
				this.setSeekerPosition(position);
				if (this.player.scrubbingTimeStep > 0) {
					state.paused = true;
					this.setState({
						paused: true,
						seeking: true,
						originallyPaused: this.state.paused,
						scrubbing: false
					});
				} else {
					this.setState({
						paused: false,
						seeking: true,
						originallyPaused: this.state.paused,
						scrubbing: false
					});
				}
			},

			/**
			 * When panning, update the seekbar position, duh.
			 */
			onPanResponderMove: (evt, gestureState) => {
				const position = this.state.seekerOffset + gestureState.dx;
				this.setSeekerPosition(position);

				if (this.player.scrubbingTimeStep > 0 && !this.state.loading && !this.state.scrubbing) {
					const time = this.calculateTimeFromSeekerPosition();
					const timeDifference = Math.abs(this.state.currentTime - time) * 1000;

					if (time < this.state.duration && timeDifference >= this.player.scrubbingTimeStep) {
						this.setState({ scrubbing: true });
						setTimeout(() => {
							this.player.ref.seek(time, this.player.scrubbingTimeStep);
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
				const time = this.calculateTimeFromSeekerPosition();
				if (time >= this.state.duration && !this.state.loading) {
					this.setState({ paused: true });
					//   this.onEnd();
				} else if (this.state.scrubbing) {
					this.setState({ seeking: false });
				} else {
					this.seekTo(time);
					this.setControlTimeout();
					this.setState({ paused: this.state.originallyPaused, seeking: false });
				}
			}
		});
	};

	renderControl = (children, callback, style = {}) => (
		<TouchableHighlight
			underlayColor="transparent"
			activeOpacity={0.3}
			onPress={() => {
				this.resetControlTimeout();
				callback();
			}}
			style={[styles.controls.control, style]}
		>
			{children}
		</TouchableHighlight>
	);

	renderNullControl = () => <View style={[styles.controls.control]} />;

	renderTopControls = () => {
		const fullscreenControl = this.props.disableFullscreen ? this.renderNullControl() : this.renderFullscreen();

		return (
			<Animated.View
				style={[
					styles.controls.top,
					{
						opacity: this.animations.topControl.opacity,
						marginTop: this.animations.topControl.marginTop
					}
				]}
			>
				<View
					style={[styles.controls.column, { backgroundColor: colors.grey400 }]}
					imageStyle={[styles.controls.vignette]}
				>
					<SafeAreaView style={styles.controls.topControlGroup}>
						<View style={styles.controls.pullRight}>
							{/* {volumeControl} */}
							{fullscreenControl}
						</View>
					</SafeAreaView>
				</View>
			</Animated.View>
		);
	};

	renderFullscreen = () => {
		const source = this.state.isFullscreen === true ? 'compress' : 'expand';
		return this.renderControl(<FontAwesome name={source} />, this.toggleFullscreen, styles.controls.fullscreen);
	};

	renderMuteUnmuteControl = () => {
		const source = this.state.muted === true ? 'volume-off' : 'volume-up';
		return this.renderControl(
			<FA5Icon style={styles.controls.toggleIcon} size={20} name={source} />,
			this.toggleMuted,
			styles.controls.playPause
		);
	};

	renderBottomControls = () => {
		const seekbarControl = this.renderSeekbar();
		const playPauseControl = this.renderPlayPause();
		const muteUnmuteControl = this.renderMuteUnmuteControl();

		return (
			<Animated.View
				style={[
					styles.controls.bottom,
					{
						opacity: this.animations.bottomControl.opacity,
						marginBottom: this.animations.bottomControl.marginBottom
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
						<View style={styles.actionButton}>
							{/* {timerControl} */}
							{muteUnmuteControl}
						</View>
					</SafeAreaView>
				</View>
			</Animated.View>
		);
	};

	renderSeekbar = () => (
		<View style={styles.seekbar.container} collapsable={false} {...this.player.seekPanResponder.panHandlers}>
			<View
				style={styles.seekbar.track}
				onLayout={event => (this.player.seekerWidth = event.nativeEvent.layout.width)}
				pointerEvents={'none'}
			>
				<View
					style={[
						styles.seekbar.fill,
						{
							width: this.state.seekerFillWidth,
							backgroundColor: colors.white
						}
					]}
					pointerEvents={'none'}
				/>
			</View>
			<View style={[styles.seekbar.handle, { left: this.state.seekerPosition }]} pointerEvents={'none'}>
				<View style={[styles.seekbar.circle, { backgroundColor: colors.white }]} pointerEvents={'none'} />
			</View>
		</View>
	);

	renderPlayPause = () => {
		const source = this.state.paused === true ? 'play' : 'pause';
		return this.renderControl(
			<FA5Icon styles={styles.controls.toggleIcon} size={20} name={source} />,
			this.togglePlayPause,
			styles.controls.playPause
		);
	};

	renderLoader = () => {
		if (this.state.loading) {
			return (
				<View style={styles.loader.container}>
					<Animated.Image
						style={[
							styles.loader.icon,
							{
								transform: [
									{
										rotate: this.animations.loader.rotate.interpolate({
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

	renderError = () => {
		if (this.state.error) {
			return (
				<View style={styles.error.container}>
					<Image style={styles.error.icon} />
					<Text style={styles.error.text}>Video unavailable</Text>
				</View>
			);
		}
		return null;
	};

	render = () => (
		<TouchableWithoutFeedback onPress={this.onScreenTouch} style={[styles.player.container]}>
			<View style={[styles.player.container]}>
				<Video
					ref={videoPlayer => (this.player.ref = videoPlayer)}
					paused={this.state.paused}
					muted={this.state.muted}
					onLoadStart={this.onLoadStart}
					onProgress={this.onProgress}
					style={[styles.player.video]}
					source={this.props.source}
					repeat
				/>
				{this.renderError()}
				{this.renderLoader()}
				{this.renderTopControls()}
				{this.renderBottomControls()}
			</View>
		</TouchableWithoutFeedback>
	);
}
