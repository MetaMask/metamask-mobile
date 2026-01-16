import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
import AndroidMediaPlayer from './AndroidMediaPlayer';
import Video from 'react-native-video';
import Device from '../../../util/device';
import Loader from './Loader';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { TapGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useStyles } from '../../../component-library/hooks';
import { ViewPropTypes } from 'deprecated-react-native-prop-types';

const styleSheet = ({ theme: { colors }, vars: { isPlaying } }) =>
  StyleSheet.create({
    loaderContainer: {
      position: 'absolute',
      zIndex: 999,
      width: '100%',
      height: '100%',
    },
    playButtonCircle: {
      backgroundColor: colors.overlay.default,
      height: 44,
      width: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoControlsStyle: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playIcon: { left: isPlaying ? 2 : 0 },
    volumeButtonCircle: {
      backgroundColor: colors.overlay.default,
      position: 'absolute',
      right: 16,
      top: 36,
      height: 36,
      width: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

function MediaPlayer({ uri, style, onClose, textTracks, selectedTextTrack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const videoRef = useRef();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoControlsOpacity = useSharedValue(0);
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, { isPlaying });

  const onLoad = () => {
    setLoading(false);
    setIsPlaying(true);
  };

  const onError = () => {
    setError(true);
    setIsPlaying(false);
  };

  // Video source can be either a number returned by import for bundled files
  // or an object of the form { uri: 'http://...' } for remote files
  const source = Number.isInteger(uri) ? uri : { uri };

  const videoControlsStyle = useAnimatedStyle(() => ({
    ...styles.videoControlsStyle,
    opacity: videoControlsOpacity.value,
  }));

  const onPressVideoControls = () => {
    videoControlsOpacity.value = withSequence(
      withTiming(1),
      withDelay(500, withTiming(0)),
    );
    setIsPlaying(!isPlaying);
  };

  const onPressVolumeControls = () => setIsMuted(!isMuted);

  return (
    <View style={style}>
      {loading && (
        <View style={[styles.loaderContainer, style]}>
          <Loader error={error} onClose={onClose} />
        </View>
      )}
      {Device.isAndroid() ? (
        <AndroidMediaPlayer
          onLoad={onLoad}
          onError={onError}
          onClose={onClose}
          source={source}
          textTracks={textTracks}
          selectedTextTrack={selectedTextTrack}
        />
      ) : (
        <>
          <Video
            onLoad={onLoad}
            onError={onError}
            style={style}
            muted={isMuted}
            paused={!isPlaying}
            source={source}
            controls={false}
            fullscreen={false}
            textTracks={textTracks}
            selectedTextTrack={selectedTextTrack}
            ignoreSilentSwitch="ignore"
            ref={videoRef}
          />
          {/**
           * Use custom controls for iOS since iOS 17.2+ begins crashing. https://github.com/react-native-video/react-native-video/issues/3329
           */}
          <TapGestureHandler onEnded={onPressVideoControls}>
            <Animated.View style={videoControlsStyle}>
              <View style={styles.playButtonCircle}>
                <Ionicons
                  name={isPlaying ? 'play' : 'pause'}
                  size={24}
                  color={colors.overlay.inverse}
                  style={styles.playIcon}
                />
              </View>
            </Animated.View>
          </TapGestureHandler>
          {isPlaying ? (
            <TouchableOpacity
              activeOpacity={1}
              style={styles.volumeButtonCircle}
              onPress={onPressVolumeControls}
            >
              <Ionicons
                name={isMuted ? 'volume-off' : 'volume-mute'}
                size={isMuted ? 22 : 28}
                color={colors.overlay.inverse}
              />
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
}

MediaPlayer.propTypes = {
  /**
   * Media URI
   * Can be a number returned by import for bundled files
   * or a string for remote files (http://...)
   */
  uri: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /**
   * Custom style object
   */
  style: ViewPropTypes.style,
  /**
   * On close callback
   */
  onClose: PropTypes.func,
  /**
   * Array of remote possible text tracks to display
   */
  textTracks: PropTypes.arrayOf(PropTypes.object),
  /**
   * The selected text track to display by id, language, title, index
   */
  selectedTextTrack: PropTypes.object,
};

MediaPlayer.defaultProps = {
  onError: () => null,
};

export default MediaPlayer;
