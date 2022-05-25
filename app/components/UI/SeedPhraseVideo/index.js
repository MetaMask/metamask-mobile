import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import MediaPlayer from '../../Views/MediaPlayer';
import { TextTrackType } from 'react-native-video';
import scaling from '../../../util/scaling';
import I18n from '../../../../locales/i18n';

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
  const language = I18n.locale.substr(0, 2);
  const baseUrl =
    'https://github.com/MetaMask/metamask-mobile/blob/main/app/videos/';
  const subtitlePath = 'subtitles/secretPhrase/subtitles-';

  const subtitleMap = {
    es: 'es',
    hi: 'hi-in',
    id: 'id-id',
    ja: 'ja-jp',
    ko: 'ko-kr',
    pt: 'pt-br',
    ru: 'ru-ru',
    tl: 'tl',
    vi: 'vi-vn',
  };

  const video_source_uri = `${baseUrl}recovery-phrase.mp4?raw=true`;

  const getSubtitleUri = () => {
    const path = `${baseUrl}${subtitlePath}`;
    const ext = '.vtt?raw=true';
    // eslint-disable-next-line no-prototype-builtins
    if (subtitleMap.hasOwnProperty(language)) {
      return `${path}${subtitleMap[language]}${ext}`;
    }
    // return english by default
    return `${path}en${ext}`;
  };

  const subtitle_source_tracks = [
    {
      index: 0,
      title: `${language} CC`,
      language: `${language}`,
      type: TextTrackType.VTT,
      uri: getSubtitleUri(),
    },
  ];

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
