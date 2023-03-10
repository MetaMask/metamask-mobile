import _ from 'lodash';
import videoSourceUri from '../../videos/recovery-phrase.mp4';
import { SRP_SUBTITLES_URL_TEMPLATE } from '../../constants/urls';

/**
 * Returns the subtitle URI for a given language
 * @param language
 */
export function getSubtitleUri(language: string): string {
  return _.template(SRP_SUBTITLES_URL_TEMPLATE)({ language });
}

// Bundled recovery phrase video resource
export const video_source_uri = videoSourceUri;
