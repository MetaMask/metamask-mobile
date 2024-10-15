import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  GestureResponderEvent,
  PanResponderGestureState,
  ViewStyle,
  TouchableHighlight,
  Image,
  Easing,
  SafeAreaView,
  TouchableNativeFeedback,
} from 'react-native';
import Video, { LoadError, OnLoadData, OnProgressData, OnSeekData, VideoProperties } from 'react-native-video';
import { useTheme } from '../../../util/theme';
import Text from '../../Base/Text';
import { baseStyles } from '../../../styles/common';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import AntIcon from 'react-native-vector-icons/AntDesign';

// Import image assets
import foxImage from '../../../../images/fox.png';
import errorIcon from '../../../../images/error-icon.png';

type Theme = ReturnType<typeof useTheme>;

interface VideoPlayerProps {
  controlsAnimationTiming: number;
  controlsToggleTiming: number;
  source: VideoProperties['source'];
  displayTopControls: boolean;
  displayBottomControls: boolean;
  onClose?: () => void;
  onError?: (error: LoadError) => void;
  textTracks?: VideoProperties['textTracks'];
  selectedTextTrack?: VideoProperties['selectedTextTrack'];
  onLoad?: (data: OnLoadData) => void;
  onProgress?: (data: OnProgressData) => void;
  onSeek?: (data: OnSeekData) => void;
  style?: ViewStyle;
  // Additional VideoProperties that might be passed to the Video component
  [key: string]: unknown;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    playerContainer: {
      flex: 1,
      overflow: 'hidden',
      zIndex: 1,
      elevation: 1,
    },
    playerVideo: {
      flex: 1,
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 8,
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
      backgroundColor: theme.brandColors.white,
    },
    seekbarPermanentFill: {
      width: '100%',
      backgroundColor: theme.colors.background.alternative,
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
      backgroundColor: theme.brandColors.white,
    },
    actionButton: {
      width: 44,
      height: 44,
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 8,
    },
    actionSeeker: {
      flex: 1,
      marginHorizontal: 8,
    },
    actionButtons: {
      color: theme.brandColors.white,
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
  onProgress: propsOnProgress,
  onSeek: propsOnSeek,
  style,
  ...videoProps
}: VideoPlayerProps & { [key: string]: unknown }) {
  const [paused, setPaused] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(true);
  const [seekerFillWidth, setSeekerFillWidth] = useState<number>(0);
  const [seekerPosition, setSeekerPosition] = useState<number>(0);
  const [seeking, setSeeking] = useState<boolean>(false);
  const [originallyPaused, setOriginallyPaused] = useState<boolean>(false);
  const [scrubbing, setScrubbing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [seekerWidth, setSeekerWidth] = useState<number>(0);

  const videoRef = useRef<Video>(null);

  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const theme = useTheme();
  const styles = createStyles(theme);

  const animations: {
    bottomControl: {
      marginBottom: Animated.Value;
      opacity: Animated.Value;
    };
    topControl: {
      marginTop: Animated.Value;
      opacity: Animated.Value;
    };
    video: {
      opacity: Animated.Value;
    };
    loader: {
      rotate: Animated.Value;
      MAX_VALUE: number;
    };
    // We use 'unknown' here as there might be additional animation properties
    // that are not explicitly defined in the interface but used in the component
    [key: string]: unknown;
  } = {
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
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
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
    (position: number) => {
      if (!position) return;
      position = constrainToSeekerMinMax(position);
      setSeekerFillWidth(position);
      setSeekerPosition(position);
    },
    [constrainToSeekerMinMax],
  );

  const loadAnimation = useCallback(() => {
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
      ]).start(() => {
        if (loading) {
          loadAnimation();
        }
      });
    }
  }, [loading, animations.loader.rotate, animations.loader.MAX_VALUE]);

  const onLoadStart = () => {
    loadAnimation();
    setLoading(true);
  };

  const onLoad = (data: OnLoadData) => {
    if (propsOnLoad) {
      propsOnLoad(data);
    }
    setDuration(data.duration);
    setLoading(false);
  };

  const onProgress = (data: OnProgressData) => {
    if (!scrubbing && !seeking && data?.seekableDuration > 0) {
      const position = data.currentTime / data.seekableDuration;
      updateSeekerPosition(position * seekerWidth);
    }
    if (propsOnProgress) {
      propsOnProgress(data);
    }
  };

  const onSeek = (data: OnSeekData) => {
    if (scrubbing) {
      if (!seeking) {
        setPaused(originallyPaused);
      }
      setScrubbing(false);
    }
    if (propsOnSeek) {
      propsOnSeek(data);
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

  const seekTo = useCallback((time = 0) => {
    if (videoRef.current) {
      videoRef.current.seek(time);
    }
  }, []);

  const seekPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          setOriginallyPaused(paused);
          setPaused(true);
          setSeeking(true);
          setScrubbing(false);
          updateSeekerPosition(e.nativeEvent.locationX);
        },
        onPanResponderMove: (e: GestureResponderEvent, _: PanResponderGestureState) => {
          setScrubbing(true);
          updateSeekerPosition(e.nativeEvent.locationX);
        },
        onPanResponderRelease: (_: GestureResponderEvent) => {
          setSeeking(false);
          setScrubbing(false);
          seekTo(calculateTimeFromSeekerPosition());
          setOriginallyPaused(false);
          setPaused(originallyPaused);
        },
      }),
    [
      originallyPaused,
      paused,
      updateSeekerPosition,
      calculateTimeFromSeekerPosition,
      seekTo,
    ],
  );

  const renderControl = useCallback(
    (children: React.ReactNode, callback: () => void, controlStyle = {}) => (
      <TouchableHighlight
        underlayColor="transparent"
        onPress={callback}
        style={[styles.controlsControl, controlStyle]}
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
          color={styles.actionButtons.color}
          size={18}
          name={`volume-${muted ? 'mute' : 'up'}`}
        />,
        toggleMuted,
        styles.controlsMuteUnmute,
      ),
    [muted, toggleMuted, styles, renderControl],
  );

  const onLayoutSeekerWidth = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => setSeekerWidth(event.nativeEvent.layout.width),
    [],
  );

  useEffect(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
  }, []);

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
          <View style={styles.seekbarCircle} pointerEvents={'none'} />
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
          color={styles.actionButtons.color}
          size={16}
          name={paused ? 'play' : 'pause'}
        />,
        togglePlayPause,
        styles.controlsPlayPause,
      ),
    [paused, togglePlayPause, styles, renderControl],
  );

  const renderLoader = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={styles.loaderContainer}>
        <Animated.Image
          source={foxImage}
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
    if (!error) return null;
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Image source={errorIcon} style={styles.errorIcon} />
          <Text style={styles.errorText}>Video unavailable</Text>
        </View>
      );
    }
  };

  const renderClose = useCallback(
    () =>
      renderControl(
        <AntIcon color={styles.actionButtons.color} size={16} name={'close'} />,
        onClose || (() => {
          // No-op function as a fallback when onClose is not provided
        }),
        {},
      ),
    [onClose, renderControl, styles.actionButtons.color],
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
          <View style={styles.seekbarContainer}>
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
      style={[styles.playerContainer, style] as ViewStyle}
    >
      <View style={baseStyles.flexGrow}>
        <Video
          ref={videoRef}
          source={source}
          style={styles.playerVideo}
          onLoad={onLoad}
          onProgress={onProgress}
          onSeek={onSeek}
          onLoadStart={onLoadStart}
          onError={onError}
          paused={paused}
          muted={muted}
          textTracks={textTracks}
          selectedTextTrack={selectedTextTrack}
          resizeMode="contain"
          repeat
          {...videoProps}
        />
        {renderLoader()}
        {renderError()}
        {onClose && displayTopControls && renderTopControls()}
        {displayBottomControls && renderBottomControls()}
      </View>
    </TouchableNativeFeedback>
  );
}

VideoPlayer.defaultProps = {
  controlsAnimationTiming: 500,
  controlsToggleTiming: 5000,
  displayTopControls: true,
  displayBottomControls: true,
};
