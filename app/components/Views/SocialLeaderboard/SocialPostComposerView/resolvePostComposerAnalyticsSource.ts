import {
  getSocialEventSource,
  SocialEvent,
  type SocialComposerEntry,
  type SocialEventSource,
} from '../analytics';
import type { SocialPostComposerViewParams } from './SocialPostComposerView.types';

const { ComposerEntry, Source } = SocialEvent;

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
  if (
    params.entryPoint === 'token_details' ||
    params.composerEntry === ComposerEntry.TOKEN_DETAILS
  ) {
    return Source.ASSET_DETAILS;
  }
  return undefined;
};

/**
 * Which button or flow opened the composer. Undefined for an open that does
 * not say, such as a deep link.
 */
export const resolvePostComposerEntry = (
  params: SocialPostComposerViewParams | undefined,
): SocialComposerEntry | undefined => {
  if (!params) {
    return undefined;
  }
  if (params.tradeInFlight) {
    return params.preview && 'product' in params.preview
      ? ComposerEntry.POST_TRADE_PERPS
      : ComposerEntry.POST_TRADE_SPOT;
  }
  if (params.entryPoint === 'perps') {
    return ComposerEntry.PERPS_POSITION;
  }
  if (params.entryPoint === 'token_details') {
    return ComposerEntry.TOKEN_DETAILS;
  }
  return params.composerEntry;
};
