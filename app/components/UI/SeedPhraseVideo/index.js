import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { InteractionManager, StyleSheet, View } from 'react-native';
import MediaPlayer from '../../Views/MediaPlayer';
import scaling from '../../../util/scaling';
import { video_source_uri, getSubtitleUri } from '../../../util/video';
import I18n from '../../../../locales/i18n';
import { TextTrackType } from 'react-native-video';

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
  const [showVideo, setShowVideo] = useState(false);
  const language = I18n.locale.substr(0, 2);
  const subtitle_source_tracks = [
    {
      index: 0,
      title: `${String(language).toUpperCase()} CC`,
      language,
      type: TextTrackType.VTT,
      uri: getSubtitleUri(language),
    },
  ];

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setShowVideo(true);
    });
  }, []);

  return (
    <View style={styles.videoContainer}>
      {showVideo ? (
        <MediaPlayer
          onClose={onClose}
          uri={video_source_uri}
          style={[styles.mediaPlayer, style]}
          textTracks={subtitle_source_tracks}
          selectedTextTrack={{ type: 'index', value: 0 }}
        />
      ) : null}
    </View>
  );
};

SeedPhraseVideo.propTypes = {
  style: PropTypes.object,
  onClose: PropTypes.func,
};

export default SeedPhraseVideo;
