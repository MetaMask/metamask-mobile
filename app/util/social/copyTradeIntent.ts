import type {
  CopyTradeIntentResponse,
  CreateCopyTradeIntentOptions,
} from '@metamask/social-controllers';
import Engine from '../../core/Engine';
import Logger from '../Logger';
import {
  buildSocialLoggerErrorOptions,
  type SocialSurface,
} from './socialServiceTelemetry';

export type { CreateCopyTradeIntentOptions } from '@metamask/social-controllers';

/**
 * Social post a trade is being copied from. Threaded from the feed into the
 * trade surfaces so they can record a copy-trade intent on submit.
 */
export interface CopyTradeOrigin {
  /** Comment (Call) id of the post. */
  commentId: string;
  /** Perps market symbol of the post; only an order on this market counts. */
  asset?: string;
}

interface CreateCopyTradeIntentMessenger {
  call: (
    action: 'SocialService:createCopyTradeIntent',
    options: CreateCopyTradeIntentOptions,
  ) => Promise<CopyTradeIntentResponse>;
}

const getMessenger = (): CreateCopyTradeIntentMessenger =>
  Engine.controllerMessenger as unknown as CreateCopyTradeIntentMessenger;

/**
 * Records that the user is copying a trade from a social post.
 *
 * Call as a member expression so the messenger keeps its `this` binding.
 */
export const createCopyTradeIntent = (
  options: CreateCopyTradeIntentOptions,
): Promise<CopyTradeIntentResponse> =>
  new Promise((resolve) => {
    resolve(
      getMessenger().call('SocialService:createCopyTradeIntent', options),
    );
  });

export const buildCopyTradeIntentOptions = (
  origin: CopyTradeOrigin,
  caip10: string,
  execution: CreateCopyTradeIntentOptions['execution'],
): CreateCopyTradeIntentOptions => ({
  origin: { kind: 'comment', id: origin.commentId },
  copierAccount: { caip10 },
  execution,
});

/**
 * Fire-and-forget copy-trade intents. A copy must never fail, wait on, or
 * surface an error to the trade it rides along with, so building the intents
 * and every request are isolated: sync throws and rejections are only logged.
 *
 * @param buildIntent - Returns the intent to send; undefined sends nothing.
 * @param context - Where the copy was placed, for Sentry.
 * @param context.surface - Social UI surface placing the trade.
 * @param context.source - Hook or component name.
 */
export function postCopyTradeIntent(
  buildIntent: () => CreateCopyTradeIntentOptions | undefined,
  context: { surface: SocialSurface; source: string },
): void {
  const reportFailure = (error: unknown) => {
    try {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        buildSocialLoggerErrorOptions({
          surface: context.surface,
          operation: 'create_copy_trade_intent',
          extraMessage: 'Error creating copy-trade intent',
          source: context.source,
          error,
        }),
      );
    } catch {
      // Logging must not throw into the trade flow either.
    }
  };

  let intent: CreateCopyTradeIntentOptions | undefined;
  try {
    intent = buildIntent();
  } catch (error) {
    reportFailure(error);
    return;
  }

  if (intent) {
    createCopyTradeIntent(intent).catch(reportFailure);
  }
}
