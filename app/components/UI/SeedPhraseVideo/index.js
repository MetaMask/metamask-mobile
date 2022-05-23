import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import MediaPlayer from '../../Views/MediaPlayer';
import { TextTrackType } from 'react-native-video';
import scaling from '../../../util/scaling';
import { strings } from '../../../../locales/i18n';
import { SRP_VIDEO } from '../../../constants/urls';

const HEIGHT = scaling.scale(240);

const styles = StyleSheet.create({
  videoContainer: {
    height: HEIGHT,
    width: '100%',
  },
  mediaPlayer: {
    height: HEIGHT,
  },
  // eslint-disable-next-line react-native/no-color-literals
  container: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'black',
  },
});

const SeedPhraseVideo = ({ style, onClose }) => {
  const [showVideo, setShowVideo] = useState(false);

  const subtitleSourceTracks = [
    {
      index: 0,
      title: strings('secret_phrase_video_subtitle.title'),
      language: strings('secret_phrase_video_subtitle.language'),
      type: TextTrackType.VTT,
      uri: strings('secret_phrase_video_subtitle.uri'),
    },
  ];

  return (
    <View style={styles.videoContainer}>
      {showVideo ? (
        <MediaPlayer
          onClose={onClose}
          uri={SRP_VIDEO}
          style={[styles.mediaPlayer, style]}
          textTracks={subtitleSourceTracks}
          selectedTextTrack={{ type: 'index', value: 0 }}
        />
      ) : (
        <TouchableOpacity
          onPress={() => setShowVideo(true)}
          style={styles.container}
        >
          <Text>Touch to watch video</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

SeedPhraseVideo.propTypes = {
  style: PropTypes.object,
  onClose: PropTypes.func,
};

export default SeedPhraseVideo;
