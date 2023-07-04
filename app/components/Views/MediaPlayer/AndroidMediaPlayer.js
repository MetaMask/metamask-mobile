import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Video from 'react-native-video';
import PropTypes from 'prop-types';
import {
  PanResponder,
  StyleSheet,
  Animated,
  SafeAreaView,
  Easing,
  Image,
  View,
  Text,
  ViewPropTypes,
  TouchableNativeFeedback,
  TouchableHighlight,
} from 'react-native';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import AntIcon from 'react-native-vector-icons/AntDesign';
import { baseStyles, colors as importedColors } from '../../../styles/common';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    playerContainer: {
      flex: 0,
      overflow: 'hidden',
      zIndex: 99999,
      elevation: 99999,
    },
    playerVideo: {
      flex: 1,
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
    },
    errorContainer: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorIcon: {
      marginBottom: 16,
    },
    errorText: {},
    loaderContainer: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    controlsColumn: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    controlsControl: {
      padding: 14,
    },
    controlsTop: {
      flex: 1,
      justifyContent: 'flex-start',
      padding: 4,
    },
    controlsBottom: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: 4,
    },
    controlsTopControlGroup: {
      alignSelf: 'flex-end',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    controlsBottomControlGroup: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    controlsPlayPause: {
      left: 1,
    },
    controlsMuteUnmute: {
      left: -1,
      top: -1,
      width: '110%',
    },
    seekbarContainer: {
      alignSelf: 'stretch',
      height: 44,
      marginLeft: 20,
      marginRight: 20,
    },
    seekbarTrack: {
      height: 1,
      position: 'relative',
      top: 20,
      width: '100%',
    },
    seekbarFill: {
      height: 4,
      width: '100%',
      borderRadius: 2,
      backgroundColor: importedColors.white,
    },
    seekbarPermanentFill: {
      width: '100%',
      backgroundColor: importedColors.blackTransparent,
    },
    seekbarHandle: {
      marginLeft: -10,
      height: 28,
      width: 28,
    },
    seekbarCircle: {
      borderRadius: 14,
      top: 14,
      height: 14,
      width: 14,
    },
    actionButton: {
      width: 44,
      height: 44,
      backgroundColor: importedColors.blackTransparent,
      borderRadius: 8,
    },
    actionSeeker: {
      flex: 1,
      marginHorizontal: 8,
    },
  });

export default function VideoPlayer({
  controlsAnimationTiming,
  controlsToggleTiming,
  source,
  displayTopControls,
  displayBottomControls,
  onClose,
  onError,
  textTracks,
  selectedTextTrack,
  onLoad: propsOnLoad,
  style,
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
  const [error] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [seekerWidth, setSeekerWidth] = useState(0);

  const videoRef = useRef();

  const controlsTimeout = useRef();

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const animations = {
    bottomControl: {
      marginBottom: useRef(new Animated.Value(0)).current,
      opacity: useRef(new Animated.Value(0)).current,
    },
    topControl: {
      marginTop: useRef(new Animated.Value(0)).current,
      opacity: useRef(new Animated.Value(0)).current,
    },
    video: {
      opacity: useRef(new Animated.Value(1)).current,
    },
    loader: {
      rotate: useRef(new Animated.Value(0)).current,
      MAX_VALUE: 360,
    },
  };

  const hideControlAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(animations.topControl.opacity, {
        toValue: 0,
        duration: controlsAnimationTiming,
        useNativeDriver: false,
      }),
      Animated.timing(animations.bottomControl.opacity, {
        toValue: 0,
        duration: controlsAnimationTiming,
        useNativeDriver: false,
      }),
    ]).start();
  }, [
    controlsAnimationTiming,
    animations.bottomControl.opacity,
    animations.topControl.opacity,
  ]);

  const hideControls = useCallback(() => {
    setShowControls(true);
    hideControlAnimation();
  }, [hideControlAnimation]);

  const resetControlsTimeout = useCallback(() => {
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      hideControls();
    }, controlsToggleTiming);
  }, [controlsToggleTiming, hideControls]);

  const showControlAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(animations.topControl.opacity, {
        toValue: 1,
        useNativeDriver: false,
        duration: controlsAnimationTiming,
      }),
      Animated.timing(animations.bottomControl.opacity, {
        toValue: 1,
        useNativeDriver: false,
        duration: controlsAnimationTiming,
      }),
    ]).start(() => resetControlsTimeout());
  }, [
    controlsAnimationTiming,
    animations.bottomControl.opacity,
    animations.topControl.opacity,
    resetControlsTimeout,
  ]);

  const toggleControls = () => {
    if (showControls) {
      showControlAnimation();
    }
    setShowControls(!showControls);
  };

  const togglePlayPause = useCallback(() => setPaused(!paused), [paused]);

  const toggleMuted = useCallback(() => setMuted(!muted), [muted]);

  const constrainToSeekerMinMax = useCallback(
    (val = 0) => {
      if (val <= 0) {
        return 0;
      } else if (val >= seekerWidth) {
        return seekerWidth;
      }
      return val;
    },
    [seekerWidth],
  );

  const updateSeekerPosition = useCallback(
    (position) => {
      if (!position) return;
      position = constrainToSeekerMinMax(position);
      setSeekerFillWidth(position);
      setSeekerPosition(position);
      setSeekerOffset(position);
    },
    [constrainToSeekerMinMax],
  );

  const loadAnimation = () => {
    if (loading) {
      Animated.sequence([
        Animated.timing(animations.loader.rotate, {
          toValue: animations.loader.MAX_VALUE,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: false,
          isInteraction: false,
        }),
        Animated.timing(animations.loader.rotate, {
          toValue: 0,
          duration: 0,
          easing: Easing.linear,
          useNativeDriver: false,
          isInteraction: false,
        }),
      ]).start(loadAnimation);
    }
  };

  const onLoadStart = () => {
    loadAnimation();
    setLoading(true);
  };

  const onLoad = (data = {}) => {
    propsOnLoad();
    setDuration(data.duration);
    setLoading(false);
  };

  const onProgress = (data = {}) => {
    if (!scrubbing && !seeking && data?.seekableDuration > 0) {
      const position = data.currentTime / data.seekableDuration;
      updateSeekerPosition(position * seekerWidth);
    }
  };

  const onSeek = (data = {}) => {
    if (scrubbing) {
      if (!seeking) {
        setPaused(originallyPaused);
      }
      setScrubbing(false);
    }
  };

  const onScreenTouch = () => {
    if (showControls) {
      toggleControls();
    } else {
      resetControlsTimeout();
    }
  };

  const calculateTimeFromSeekerPosition = useCallback(() => {
    const percent = seekerPosition / seekerWidth;
    return duration * percent;
  }, [seekerPosition, seekerWidth, duration]);

  const seekTo = (time = 0) => {
    videoRef.current.seek(time);
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
          const position = evt.nativeEvent.locationX;
          updateSeekerPosition(position);
          setPaused(false);
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

          if (!loading && !scrubbing) {
            const time = calculateTimeFromSeekerPosition();

            if (time < duration) {
              setScrubbing(true);
              setTimeout(() => {
                seekTo(time);
              }, 1);
            }
          }
        },

        /**
         * On release we update the time and seek to it in the video.
         */
        onPanResponderRelease: (evt, gestureState) => {
          const time = calculateTimeFromSeekerPosition();
          if (time >= duration && !loading) {
            setPaused(true);
          } else if (scrubbing) {
            setSeeking(false);
          } else {
            seekTo(time);
            setPaused(originallyPaused);
            setSeeking(false);
          }
        },
      }),
    [
      updateSeekerPosition,
      calculateTimeFromSeekerPosition,
      duration,
      loading,
      originallyPaused,
      paused,
      scrubbing,
      seekerOffset,
    ],
  );

  const renderControl = useCallback(
    (children, callback, style = {}) => (
      <TouchableHighlight
        underlayColor="transparent"
        onPress={callback}
        style={[styles.controlsControl, style]}
      >
        {children}
      </TouchableHighlight>
    ),
    [styles],
  );

  const renderMuteUnmuteControl = useCallback(
    () =>
      renderControl(
        <FA5Icon
          color={importedColors.white}
          size={18}
          name={`volume-${muted ? 'mute' : 'up'}`}
        />,
        toggleMuted,
        styles.controlsMuteUnmute,
      ),
    [muted, toggleMuted, styles, renderControl],
  );

  const onLayoutSeekerWidth = useCallback(
    (event) => setSeekerWidth(event.nativeEvent.layout.width),
    [],
  );

  useEffect(() => clearTimeout(controlsTimeout.current), []);

  const renderSeekbar = useCallback(
    () => (
      <View
        style={styles.seekbarContainer}
        collapsable={false}
        {...seekPanResponder.panHandlers}
      >
        <View style={styles.seekbarTrack}>
          <View style={[styles.seekbarFill, styles.seekbarPermanentFill]} />
        </View>
        <View
          style={styles.seekbarTrack}
          onLayout={onLayoutSeekerWidth}
          pointerEvents={'none'}
        >
          <View
            style={[
              styles.seekbarFill,
              {
                width: seekerFillWidth,
              },
            ]}
            pointerEvents={'none'}
          />
        </View>

        <View
          style={[styles.seekbarHandle, { left: seekerPosition }]}
          pointerEvents={'none'}
        >
          <View
            style={[
              styles.seekbarCircle,
              { backgroundColor: importedColors.white },
            ]}
            pointerEvents={'none'}
          />
        </View>
      </View>
    ),
    [
      seekerPosition,
      seekPanResponder.panHandlers,
      seekerFillWidth,
      onLayoutSeekerWidth,
      styles,
    ],
  );

  const renderPlayPause = useCallback(
    () =>
      renderControl(
        <FA5Icon
          color={importedColors.white}
          size={16}
          name={paused ? 'play' : 'pause'}
        />,
        togglePlayPause,
        styles.controlsPlayPause,
      ),
    [paused, togglePlayPause, styles, renderControl],
  );

  const renderLoader = useCallback(() => {
    if (!loading) return;
    return (
      <View style={styles.loaderContainer}>
        <Animated.Image
          style={{
            transform: [
              {
                rotate: animations.loader.rotate.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        />
      </View>
    );
  }, [loading, animations.loader.rotate, styles]);

  const renderError = () => {
    if (!error) return;
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Image style={styles.errorIcon} />
          <Text style={styles.errorText}>Video unavailable</Text>
        </View>
      );
    }
  };

  const renderClose = useCallback(
    () =>
      renderControl(
        <AntIcon color={importedColors.white} size={16} name={'close'} />,
        onClose,
        {},
      ),
    [onClose, renderControl],
  );

  const renderTopControls = () => (
    <Animated.View
      style={[
        styles.controlsTop,
        {
          opacity: animations.bottomControl.opacity,
        },
      ]}
    >
      <View style={[styles.controlsColumn]}>
        <SafeAreaView
          style={[styles.controlsRow, styles.controlsTopControlGroup]}
        >
          <View style={styles.actionButton}>{renderClose()}</View>
        </SafeAreaView>
      </View>
    </Animated.View>
  );

  const renderBottomControls = () => (
    <Animated.View
      style={[
        styles.controlsBottom,
        {
          opacity: animations.bottomControl.opacity,
        },
      ]}
    >
      <View style={[styles.controlsColumn]}>
        <SafeAreaView
          style={[styles.controlsRow, styles.controlsBottomControlGroup]}
        >
          <View style={styles.actionButton}>{renderPlayPause()}</View>
          <View style={[styles.actionButton, styles.actionSeeker]}>
            {renderSeekbar()}
          </View>
          <View style={styles.actionButton}>{renderMuteUnmuteControl()}</View>
        </SafeAreaView>
      </View>
    </Animated.View>
  );
  return (
    <TouchableNativeFeedback
      onPress={onScreenTouch}
      style={[styles.playerContainer, style]}
    >
      <View style={baseStyles.flexGrow}>
        <Video
          ref={videoRef}
          paused={paused}
          muted={muted}
          onLoad={onLoad}
          onError={onError}
          onSeek={onSeek}
          onLoadStart={onLoadStart}
          onProgress={onProgress}
          style={styles.playerVideo}
          textTracks={textTracks}
          selectedTextTrack={selectedTextTrack}
          source={source}
          resizeMode="contain"
          repeat
        />
        {renderError()}
        {renderLoader()}
        {onClose && displayTopControls && renderTopControls()}
        {displayBottomControls && renderBottomControls()}
      </View>
    </TouchableNativeFeedback>
  );
}

VideoPlayer.propTypes = {
  controlsAnimationTiming: PropTypes.number,
  controlsToggleTiming: PropTypes.number,
  // source can be a uri object for remote files
  // or a number returned by import for bundled files
  source: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  displayTopControls: PropTypes.bool,
  displayBottomControls: PropTypes.bool,
  onClose: PropTypes.func,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
  selectedTextTrack: PropTypes.object,
  textTracks: PropTypes.arrayOf(PropTypes.object),
  style: ViewPropTypes.style,
};

VideoPlayer.defaultProps = {
  doubleTapTime: 100,
  controlsAnimationTiming: 500,
  controlsToggleTiming: 5000,
  displayTopControls: true,
  displayBottomControls: true,
};
