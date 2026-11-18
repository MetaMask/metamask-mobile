import Logger from '../../../util/Logger';

/** Temporary local diagnostic: classify only the two links under investigation. */
export const coldStartDebugRoute = (uri?: string | null) => {
  if (!uri) {
    return 'none';
  }
  if (typeof uri !== 'string') {
    return 'other';
  }

  const match =
    /^(?:metamask:\/\/|https:\/\/[^/?#]+\/)(money-account-deposit|perps)(?=[/?#]|$)/u.exec(
      uri,
    );
  return match?.[1] ?? 'other';
};

/** Temporary local diagnostic. Pass only route names, statuses and booleans. */
export const logColdStartDeeplink = (
  stage: string,
  details: Record<string, string | boolean | undefined>,
) => {
  if (__DEV__ && process.env.NODE_ENV !== 'test') {
    Logger.log(`[ColdStartDeeplink] ${stage} ${JSON.stringify(details)}`);
  }
};
