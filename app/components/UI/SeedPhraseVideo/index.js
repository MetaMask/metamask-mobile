import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { InteractionManager, StyleSheet, View } from 'react-native';
import MediaPlayer from '../../Views/MediaPlayer';
import scaling from '../../../util/scaling';
import I18n from '../../../../locales/i18n';
import recoveryPhraseVideo from '../../../videos/recovery-phrase.mp4';

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
          uri={recoveryPhraseVideo}
          style={[styles.mediaPlayer, style]}
          selectedTextTrack={{ type: 'language', value: language }}
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
