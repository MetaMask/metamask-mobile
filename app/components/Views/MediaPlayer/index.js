import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, View, StyleSheet } from 'react-native';
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
          source={{ uri }}
          textTracks={textTracks}
          selectedTextTrack={selectedTextTrack}
        />
      ) : (
        <Video
          onLoad={onLoad}
          onError={onError}
          style={style}
          muted
          source={{ uri }}
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
   */
  uri: PropTypes.string,
  /**
   * Custom style object
   */
  style: ViewPropTypes.style,
  /**
   * On close callback
   */
  onClose: PropTypes.func,
  /**
   * Array of possible text tracks to display
   */
  textTracks: PropTypes.arrayOf(PropTypes.object),
  /**
   * The selected text track to dispaly by id, language, title, index
   */
  selectedTextTrack: PropTypes.object,
};

MediaPlayer.defaultProps = {
  onError: () => null,
};

export default MediaPlayer;
