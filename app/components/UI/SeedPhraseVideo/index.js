import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import MediaPlayer from '../../Views/MediaPlayer';
import scaling from '../../../util/scaling';
import { baseUrl, subtitle_source_tracks } from '../../../util/subtitle';

const HEIGHT = scaling.scale(240);

const styles = StyleSheet.create({
  videoContainer: {
    height: HEIGHT,
    width: '100%',
  },
  mediaPlayer: {
    height: HEIGHT,
  },
});

const SeedPhraseVideo = ({ style, onClose }) => {
  const video_source_uri = `${baseUrl}recovery-phrase.mp4?raw=true`;

  return (
    <View style={styles.videoContainer}>
      <MediaPlayer
        onClose={onClose}
        uri={video_source_uri}
        style={[styles.mediaPlayer, style]}
        textTracks={subtitle_source_tracks}
        selectedTextTrack={{ type: 'index', value: 0 }}
      />
    </View>
  );
};

SeedPhraseVideo.propTypes = {
  style: PropTypes.object,
  onClose: PropTypes.func,
};

export default SeedPhraseVideo;
