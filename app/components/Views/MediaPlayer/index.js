import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ViewPropTypes } from 'react-native';
import AndroidMediaPlayer from './AndroidMediaPlayer';
import Video from 'react-native-video';
import Device from '../../../util/device';
import Loader from './Loader';

const styles = StyleSheet.create({
  loaderContainer: {
    position: 'absolute',
    zIndex: 999,
    width: '100%',
    height: '100%',
  },
});

function MediaPlayer({ uri, style, onClose, textTracks, selectedTextTrack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const onLoad = () => setLoading(false);

  const onError = () => setError(true);

  // Video source can be either a number returned by import for bundled files
  // or an object of the form { uri: 'http://...' } for remote files
  const source = Number.isInteger(uri) ? uri : { uri };

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
        <Video
          onLoad={onLoad}
          onError={onError}
          style={style}
          muted
          source={source}
          controls
          textTracks={textTracks}
          selectedTextTrack={selectedTextTrack}
          ignoreSilentSwitch="ignore"
        />
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
