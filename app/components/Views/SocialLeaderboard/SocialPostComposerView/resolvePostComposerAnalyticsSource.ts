import {
  getSocialEventSource,
  SocialEvent,
  type SocialEventSource,
} from '../analytics';
import type { SocialPostComposerViewParams } from './SocialPostComposerView.types';

const { Source } = SocialEvent;

/**
 * Social Screen Viewed `source` for the composer.
 * A trade share carries the surface that started it. Token details and Perps
 * keep their existing entry points. An unknown trade-in-flight open omits source.
 */
export const resolvePostComposerAnalyticsSource = (
  params: SocialPostComposerViewParams | undefined,
): SocialEventSource | undefined => {
  if (!params) {
    return undefined;
  }
  if ('analyticsSource' in params) {
    const fromRoute = getSocialEventSource(params.analyticsSource);
    if (fromRoute) {
      return fromRoute;
    }
  }
  if (params.entryPoint === 'perps') {
    return Source.PERP_ASSET_SCREEN;
  }
  if (params.entryPoint === 'token_details') {
    return Source.ASSET_DETAILS;
  }
  return undefined;
};
