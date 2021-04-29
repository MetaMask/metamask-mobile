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
		volume: {
			flexDirection: 'row'
		},
		fullscreen: {
			flexDirection: 'row'
		},
		playPause: {
			position: 'relative',
			width: 80,
			zIndex: 0
		},
		title: {
			alignItems: 'center',
			flex: 0.6,
			flexDirection: 'column',
			padding: 0
		},
		titleText: {
			textAlign: 'center'
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
	volume: StyleSheet.create({
		container: {
			alignItems: 'center',
			justifyContent: 'flex-start',
			flexDirection: 'row',
			height: 1,
			marginLeft: 20,
			marginRight: 20,
			width: 150
		},
		track: {
			height: 1,
			marginLeft: 7
		},
		fill: {
			height: 1
		},
		handle: {
			position: 'absolute',
			marginTop: -24,
			marginLeft: -24,
			padding: 16
		},
		icon: {
			marginLeft: 7
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
		playInBackground: PropTypes.bool,
		playWhenInactive: PropTypes.bool,
		resizeMode: PropTypes.string,
		isFullscreen: PropTypes.bool,
		showOnStart: PropTypes.bool,
		paused: PropTypes.bool,
		repeat: PropTypes.bool,
		muted: PropTypes.bool,
		volume: PropTypes.number,
		title: PropTypes.string,
		rate: PropTypes.number,

		isFullScreen: PropTypes.bool,
		onError: PropTypes.func,
		onEnd: PropTypes.func,
		onEnterFullscreen: PropTypes.func,
		onShowControls: PropTypes.func,
		onHideControls: PropTypes.func,
		onPause: PropTypes.func,
		onPlay: PropTypes.func,

		onBack: PropTypes.func,
		onExitFullscreen: PropTypes.func,
		onLoadStart: PropTypes.func,
		onLoad: PropTypes.func,
		onProgress: PropTypes.func,

		controlTimeout: PropTypes.func,
		scrubbing: PropTypes.bool,
		tapAnywhereToPause: PropTypes.bool,
		videoStyle: PropTypes.object,
		style: PropTypes.object,
		disableFullscreen: PropTypes.bool,

		seekColor: PropTypes.string,
		source: PropTypes.string,

		navigator: PropTypes.object
	};

	static defaultProps = {
		toggleResizeModeOnFullscreen: true,
		controlAnimationTiming: 500,
		doubleTapTime: 130,
		playInBackground: false,
		playWhenInactive: false,
		resizeMode: 'contain',
		isFullscreen: false,
		showOnStart: true,
		paused: false,
		repeat: false,
		muted: false,
		volume: 1,
		title: '',
		rate: 1
	};

	/**
	 * All of our values that are updated by the
	 * methods and listeners in this class
	 */
	state = {
		// Video
		resizeMode: this.props.resizeMode,
		paused: this.props.paused,
		muted: this.props.muted,
		volume: this.props.volume,
		rate: this.props.rate,
		// Controls
		isFullscreen: this.props.isFullScreen || this.props.resizeMode === 'cover' || false,
		showTimeRemaining: true,
		volumeTrackWidth: 0,
		volumeFillWidth: 0,
		seekerFillWidth: 0,
		showControls: this.props.showOnStart,
		volumePosition: 0,
		seekerPosition: 0,
		volumeOffset: 0,
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
	 * Any options that can be set at init.
	 */
	opts = {
		playWhenInactive: this.props.playWhenInactive,
		playInBackground: this.props.playInBackground,
		repeat: this.props.repeat,
		title: this.props.title
	};

	/**
	 * Our app listeners and associated methods
	 */
	events = {
		onError: this.props.onError || this._onError,
		onBack: this.props.onBack || this.onBack,
		onEnd: this.props.onEnd || this.onEnd,
		onScreenTouch: this._onScreenTouch,
		onEnterFullscreen: this.props.onEnterFullscreen,
		onExitFullscreen: this.props.onExitFullscreen,
		onShowControls: this.props.onShowControls,
		onHideControls: this.props.onHideControls,
		onLoadStart: this._onLoadStart,
		onProgress: this._onProgress,
		onSeek: this._onSeek,
		onLoad: this._onLoad,
		onPause: this.props.onPause,
		onPlay: this.props.onPlay
	};

	/**
	 * Player information
	 */
	player = {
		controlTimeoutDelay: this.props.controlTimeout || 15000,
		volumePanResponder: PanResponder,
		seekPanResponder: PanResponder,
		controlTimeout: null,
		tapActionTimeout: null,
		volumeWidth: 150,
		iconOffset: 0,
		seekerWidth: 0,
		ref: Video,
		scrubbingTimeStep: this.props.scrubbing || 0,
		tapAnywhereToPause: this.props.tapAnywhereToPause
	};

	/**
	 * Various animations
	 */
	initialValue = this.props.showOnStart ? 1 : 0;

	animations = {
		bottomControl: {
			marginBottom: new Animated.Value(0),
			opacity: new Animated.Value(this.initialValue)
		},
		topControl: {
			marginTop: new Animated.Value(0),
			opacity: new Animated.Value(this.initialValue)
		},
		video: {
			opacity: new Animated.Value(1)
		},
		loader: {
			rotate: new Animated.Value(0),
			MAX_VALUE: 360
		}
	};

	/**
	 * Various styles that be added...
	 */
	styles = {
		videoStyle: this.props.videoStyle || {},
		containerStyle: this.props.style || {}
	};
	/**
    | -------------------------------------------------------
    | Events
    | -------------------------------------------------------
    |
    | These are the events that the <Video> component uses
    | and can be overridden by assigning it as a prop.
    | It is suggested that you override onEnd.
    |
    */

	/**
	 * When load starts we display a loading icon
	 * and show the controls.
	 */
	onLoadStart = args => {
		this.loadAnimation();
		this.setState({ loading: true });

		if (typeof this.props.onLoadStart === 'function') {
			this.props.onLoadStart(args);
		}
	};

	/**
	 * When load is finished we hide the load icon
	 * and hide the controls. We also set the
	 * video duration.
	 *
	 * @param {object} data The video meta data
	 */
	onLoad = (data = {}) => {
		this.setState({ duration: data.duration, loading: false });

		if (this.state.showControls) {
			this.setControlTimeout();
		}

		if (typeof this.props.onLoad === 'function') {
			this.props.onLoad(data);
		}
	};

	/**
	 * For onprogress we fire listeners that
	 * update our seekbar and timer.
	 *
	 * @param {object} data The video meta data
	 */
	onProgress = (data = {}) => {
		const { scrubbing, seeking } = this.state;
		if (!scrubbing) {
			if (!seeking) {
				const position = this.calculateSeekerPosition();
				this.setSeekerPosition(position);
			}

			if (typeof this.props.onProgress === 'function') {
				this.props.onProgress(data);
			}

			this.setState({ currentTime: data.currentTime });
		}
	};

	/**
	 * For onSeek we clear scrubbing if set.
	 *
	 * @param {object} data The video meta data
	 */
	onSeek = (data = {}) => {
		if (this.state.scrubbing) {
			// Seeking may be false here if the user released the seek bar while the player was still processing
			// the last seek command. In this case, perform the steps that have been postponed.
			if (!this.state.seeking) {
				this.setControlTimeout();
				this.setState({ scrubbing: false, currentTime: data.currentTime, paused: this.state.originallyPaused });
			} else {
				this.setState({ scrubbing: false, currentTime: data.currentTime });
			}
		}
	};

	/**
	 * It is suggested that you override this
	 * command so your app knows what to do.
	 * Either close the video or go to a
	 * new page.
	 */
	onEnd = () => null;

	/**
	 * Set the error state to true which then
	 * changes our renderError function
	 *
	 * @param {object} err  Err obj returned from <Video> component
	 */
	onError = () => {
		this.setState({ error: true, loading: false });
	};

	/**
	 * This is a single and double tap listener
	 * when the user taps the screen anywhere.
	 * One tap toggles controls and/or toggles pause,
	 * two toggles fullscreen mode.
	 */
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

	/**
    | -------------------------------------------------------
    | Methods
    | -------------------------------------------------------
    |
    | These are all of our functions that interact with
    | various parts of the class. Anything from
    | calculating time remaining in a video
    | to handling control operations.
    |
    */

	/**
	 * Set a timeout when the controls are shown
	 * that hides them after a length of time.
	 * Default is 15s
	 */
	setControlTimeout = () => {
		this.player.controlTimeout = setTimeout(() => {
			this._hideControls();
		}, this.player.controlTimeoutDelay);
	};

	/**
	 * Clear the hide controls timeout.
	 */
	clearControlTimeout = () => {
		clearTimeout(this.player.controlTimeout);
	};

	/**
	 * Reset the timer completely
	 */
	resetControlTimeout = () => {
		this.clearControlTimeout();
		this.setControlTimeout();
	};

	/**
	 * Animation to hide controls. We fade the
	 * display to 0 then move them off the
	 * screen so they're not interactable
	 */
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

	/**
	 * Animation to show controls...opposite of
	 * above...move onto the screen and then
	 * fade in.
	 */
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

	/**
	 * Loop animation to spin loader icon. If not loading then stop loop.
	 */
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

	/**
	 * Function to hide the controls. Sets our
	 * state then calls the animation.
	 */
	_hideControls = () => {
		if (this.mounted) {
			this.hideControlAnimation();
			typeof this.events.onHideControls === 'function' && this.events.onHideControls();

			this.setState({ showControls: false });
		}
	};

	/**
	 * Function to toggle controls based on
	 * current state.
	 */
	_toggleControls = () => {
		if (this.state.showControls) {
			this.showControlAnimation();
			this.setControlTimeout();
			typeof this.events.onShowControls === 'function' && this.events.onShowControls();
		} else {
			this.hideControlAnimation();
			this.clearControlTimeout();
			typeof this.events.onHideControls === 'function' && this.events.onHideControls();
		}

		this.setState({ showControls: !this.state.showControls });
	};

	/**
	 * Toggle fullscreen changes resizeMode on
	 * the <Video> component then updates the
	 * isFullscreen state.
	 */
	_toggleFullscreen = () => {
		if (this.props.toggleResizeModeOnFullscreen) {
			//   state.resizeMode = this.state.isFullscreen === true ? 'cover' : 'contain';
		}

		if (this.state.isFullscreen) {
			typeof this.events.onEnterFullscreen === 'function' && this.events.onEnterFullscreen();
		} else {
			typeof this.events.onExitFullscreen === 'function' && this.events.onExitFullscreen();
		}

		// this.setState({isFullscreen: !this.state.isFullscreen});
	};

	/**
	 * Toggle playing state on <Video> component
	 */
	togglePlayPause = () => {
		if (this.state.paused) {
			typeof this.events.onPause === 'function' && this.events.onPause();
		} else {
			typeof this.events.onPlay === 'function' && this.events.onPlay();
		}

		this.setState({ paused: !this.state.paused });
	};

	/**
	 * Toggle between showing time remaining or
	 * video duration in the timer control
	 */
	toggleTimer = () => {
		this.setState({ showTimeRemaining: !this.state.showTimeRemaining });
	};

	toggleMuted = () => {
		this.setState({ muted: !this.state.muted });
	};

	/**
	 * The default 'onBack' function pops the navigator
	 * and as such the video player requires a
	 * navigator prop by default.
	 */
	onBack = () => {
		if (this.props.navigator && this.props.navigator.pop) {
			this.props.navigator.pop();
		} else {
			console.warn(
				'Warning: onBack requires navigator property to function. Either modify the onBack prop or pass a navigator prop'
			);
		}
	};

	/**
	 * Calculate the time to show in the timer area
	 * based on if they want to see time remaining
	 * or duration. Formatted to look as 00:00.
	 */
	//   calculateTime = () => {
	//     if (this.state.showTimeRemaining) {
	//       const time = this.state.duration - this.state.currentTime;
	//       return `-${this.formatTime(time)}`;
	//     }

	//     return this.formatTime(this.state.currentTime);
	//   }

	/**
   * Format a time string as mm:ss
   *
   * @param {int} time time in milliseconds
   * @return {string} formatted time string in mm:ss format
//    */
	//   formatTime(time = 0) {
	//     const symbol = this.state.showRemainingTime ? '-' : '';
	//     time = Math.min(Math.max(time, 0), this.state.duration);

	//     const formattedMinutes = padStart(Math.floor(time / 60).toFixed(0), 2, 0);
	//     const formattedSeconds = padStart(Math.floor(time % 60).toFixed(0), 2, 0);

	//     return `${symbol}${formattedMinutes}:${formattedSeconds}`;
	//   }

	/**
	 * Set the position of the seekbar's components
	 * (both fill and handle) according to the
	 * position supplied.
	 *
	 * @param {float} position position in px of seeker handle}
	 */
	setSeekerPosition = (position = 0) => {
		position = this.constrainToSeekerMinMax(position);

		if (!this.state.seeking) {
			this.setState({ seekerFillWidth: position, seekerPosition: position, seekerOffset: position });
		} else {
			this.setState({ seekerFillWidth: position, seekerPosition: position });
		}
	};

	/**
	 * Constrain the location of the seeker to the
	 * min/max value based on how big the
	 * seeker is.
	 *
	 * @param {float} val position of seeker handle in px
	 * @return {float} constrained position of seeker handle in px
	 */
	constrainToSeekerMinMax = (val = 0) => {
		if (val <= 0) {
			return 0;
		} else if (val >= this.player.seekerWidth) {
			return this.player.seekerWidth;
		}
		return val;
	};

	/**
	 * Calculate the position that the seeker should be
	 * at along its track.
	 *
	 * @return {float} position of seeker handle in px based on currentTime
	 */
	calculateSeekerPosition = () => {
		const percent = this.state.currentTime / this.state.duration;
		return this.player.seekerWidth * percent;
	};

	/**
	 * Return the time that the video should be at
	 * based on where the seeker handle is.
	 *
	 * @return {float} time in ms based on seekerPosition.
	 */
	calculateTimeFromSeekerPosition = () => {
		const percent = this.state.seekerPosition / this.player.seekerWidth;
		return this.state.duration * percent;
	};

	/**
	 * Seek to a time in the video.
	 *
	 * @param {float} time time to seek to in ms
	 */
	seekTo = (time = 0) => {
		this.player.ref.seek(time);
		this.setState({ currentTime: time });
	};

	/**
	 * Set the position of the volume slider
	 *
	 * @param {float} position position of the volume handle in px
	 */
	setVolumePosition = (position = 0) => {
		// const state = this.state;
		// position = this.constrainToVolumeMinMax(position);
		// state.volumePosition = position + this.player.iconOffset;
		// state.volumeFillWidth = position;
		// state.volumeTrackWidth = this.player.volumeWidth - state.volumeFillWidth;
		// if (state.volumeFillWidth < 0) {
		//   state.volumeFillWidth = 0;
		// }
		// if (state.volumeTrackWidth > 150) {
		//   state.volumeTrackWidth = 150;
		// }
		// this.setState(state);
	};

	/**
	 * Constrain the volume bar to the min/max of
	 * its track's width.
	 *
	 * @param {float} val position of the volume handle in px
	 * @return {float} contrained position of the volume handle in px
	 */
	constrainToVolumeMinMax = (val = 0) => {
		if (val <= 0) {
			return 0;
		} else if (val >= this.player.volumeWidth + 9) {
			return this.player.volumeWidth + 9;
		}
		return val;
	};

	/**
	 * Get the volume based on the position of the
	 * volume object.
	 *
	 * @return {float} volume level based on volume handle position
	 */
	calculateVolumeFromVolumePosition = () => this.state.volumePosition / this.player.volumeWidth;

	/**
	 * Get the position of the volume handle based
	 * on the volume
	 *
	 * @return {float} volume handle position in px based on volume
	 */
	calculateVolumePositionFromVolume = () => this.player.volumeWidth * this.state.volume;

	/**
    | -------------------------------------------------------
    | React Component functions
    | -------------------------------------------------------
    |
    | Here we're initializing our listeners and getting
    | the component ready using the built-in React
    | Component methods
    |
    */

	/**
	 * Before mounting, init our seekbar and volume bar
	 * pan responders.
	 */
	UNSAFE_componentWillMount = () => {
		this.initSeekPanResponder();
		this.initVolumePanResponder();
	};

	/**
	 * To allow basic playback management from the outside
	 * we have to handle possible props changes to state changes
	 */
	UNSAFE_componentWillReceiveProps = nextProps => {
		if (this.state.paused !== nextProps.paused) {
			this.setState({
				paused: nextProps.paused
			});
		}

		if (this.styles.videoStyle !== nextProps.videoStyle) {
			this.styles.videoStyle = nextProps.videoStyle;
		}

		if (this.styles.containerStyle !== nextProps.style) {
			this.styles.containerStyle = nextProps.style;
		}
	};

	/**
	 * Upon mounting, calculate the position of the volume
	 * bar based on the volume property supplied to it.
	 */
	componentDidMount = () => {
		const position = this.calculateVolumePositionFromVolume();
		this.setVolumePosition(position);
		this.mounted = true;

		this.setState({ volumeOffset: position });
	};

	/**
	 * When the component is about to unmount kill the
	 * timeout less it fire in the prev/next scene
	 */
	componentWillUnmount = () => {
		this.mounted = false;
		this.clearControlTimeout();
	};

	/**
	 * Get our seekbar responder going
	 */
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
					//   this.events.onEnd();
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

	/**
	 * Initialize the volume pan responder.
	 */
	initVolumePanResponder = () => {
		this.player.volumePanResponder = PanResponder.create({
			onStartShouldSetPanResponder: (evt, gestureState) => true,
			onMoveShouldSetPanResponder: (evt, gestureState) => true,
			onPanResponderGrant: (evt, gestureState) => {
				this.clearControlTimeout();
			},

			/**
			 * Update the volume as we change the position.
			 * If we go to 0 then turn on the mute prop
			 * to avoid that weird static-y sound.
			 */
			onPanResponderMove: (evt, gestureState) => {
				const position = this.state.volumeOffset + gestureState.dx;

				this.setVolumePosition(position);
				const volume = this.calculateVolumeFromVolumePosition();

				if (this.state.volume <= 0) {
					this.setState({ volume, muted: true });
				} else {
					this.setState({ volume, muted: false });
				}
			},

			/**
			 * Update the offset...
			 */
			onPanResponderRelease: (evt, gestureState) => {
				this.setControlTimeout();
				this.setState({ volumeOffset: this.state.volumePosition });
			}
		});
	};

	/**
    | -------------------------------------------------------
    | Rendering
    | -------------------------------------------------------
    |
    | This section contains all of our render
    | In addition to the typical React render func
    | we also have all the render methods for
    | the controls.
    |
    */

	/**
	 * Standard render control function that handles
	 * everything except the sliders. Adds a
	 * consistent <TouchableHighlight>
	 * wrapper and styling.
	 */
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

	/**
	 * Renders an empty control, used to disable a control without breaking the view layout.
	 */
	renderNullControl = () => <View style={[styles.controls.control]} />;

	/**
	 * Groups the top bar controls together in an animated
	 * view and spaces them out.
	 */
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

	/**
	 * Render the volume slider and attach the pan handlers
	 */
	renderVolume = () => (
		<View style={styles.volume.container}>
			<View style={[styles.volume.fill, { width: this.state.volumeFillWidth }]} />
			<View style={[styles.volume.track, { width: this.state.volumeTrackWidth }]} />
			<View
				style={[styles.volume.handle, { left: this.state.volumePosition }]}
				{...this.player.volumePanResponder.panHandlers}
			>
				<FA5Icon name={'volume-up'} />
			</View>
		</View>
	);

	/**
	 * Render fullscreen toggle and set icon based on the fullscreen state.
	 */
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

	/**
	 * Render bottom control group and wrap it in a holder
	 */
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

	/**
	 * Render the seekbar and attach its handlers
	 */
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
							backgroundColor: this.props.seekColor || '#FFF'
						}
					]}
					pointerEvents={'none'}
				/>
			</View>
			<View style={[styles.seekbar.handle, { left: this.state.seekerPosition }]} pointerEvents={'none'}>
				<View
					style={[styles.seekbar.circle, { backgroundColor: this.props.seekColor || '#FFF' }]}
					pointerEvents={'none'}
				/>
			</View>
		</View>
	);

	/**
	 * Render the play/pause button and show the respective icon
	 */
	renderPlayPause = () => {
		const source = this.state.paused === true ? 'play' : 'pause';
		return this.renderControl(
			<FA5Icon styles={styles.controls.toggleIcon} size={20} name={source} />,
			this.togglePlayPause,
			styles.controls.playPause
		);
	};

	/**
   * Show our timer.
//    */
	//   renderTimer = () => {
	//     return this.renderControl(
	//       <Text style={styles.controls.timerText}>{this.calculateTime()}</Text>,
	//       this.toggleTimer,
	//       styles.controls.timer,
	//     );
	//   }

	/**
	 * Show loading icon
	 */
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

	/**
	 * Provide all of our options and render the whole component.
	 */
	render = () => (
		<TouchableWithoutFeedback
			onPress={this.events.onScreenTouch}
			style={[styles.player.container, this.styles.containerStyle]}
		>
			<View style={[styles.player.container, this.styles.containerStyle]}>
				<Video
					{...this.props}
					ref={videoPlayer => (this.player.ref = videoPlayer)}
					resizeMode={this.state.resizeMode}
					volume={this.state.volume}
					paused={this.state.paused}
					muted={this.state.muted}
					rate={this.state.rate}
					onLoadStart={this.events.onLoadStart}
					onProgress={this.events.onProgress}
					onError={this.events.onError}
					onLoad={this.events.onLoad}
					onEnd={this.events.onEnd}
					onSeek={this.events.onSeek}
					style={[styles.player.video, this.styles.videoStyle]}
					source={this.props.source}
				/>
				{this.renderError()}
				{this.renderLoader()}
				{this.renderTopControls()}
				{this.renderBottomControls()}
			</View>
		</TouchableWithoutFeedback>
	);
}

/**
 * This object houses our styles. There's player
 * specific styles and control specific ones.
 * And then there's volume/seeker styles.
 */
