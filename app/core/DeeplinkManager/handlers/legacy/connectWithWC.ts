import { INTERNAL_ORIGINS } from '../../../../constants/transaction';
import WC2Manager, {
  isWC2Enabled,
} from '../../../WalletConnect/WalletConnectV2';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import extractURLParams from '../../utils/extractURLParams';

export async function connectWithWC({
  handled,
  wcURL,
  origin,
  params,
}: {
  handled: () => void;
  wcURL: string;
  origin: string;
  params: ReturnType<typeof extractURLParams>['params'];
}) {
  handled();

  const preview = wcURL.length > 160 ? `${wcURL.slice(0, 160)}...` : wcURL;
  DevLogger.log('[wc][connectWithWC] connect called:', {
    origin,
    wcURLPreview: preview,
    redirect: params?.redirect,
  });

  if (params.channelId && INTERNAL_ORIGINS.includes(params.channelId)) {
    DevLogger.log(
      '[wc][connectWithWC] rejected wc connection due to internal channelId',
      { channelId: params.channelId },
    );
    return;
  }

  try {
    if (!isWC2Enabled) {
      DevLogger.log(
        '[wc][connectWithWC] WC2 is not enabled (missing/empty WALLET_CONNECT_PROJECT_ID)',
      );
      return;
    }
    DevLogger.log('[wc][connectWithWC] ensuring WC2Manager is initialized');
    // Must pass an options object; the init signature destructures params.
    await WC2Manager.init({});
  } catch (err) {
    DevLogger.log(
      '[wc][connectWithWC] WC2Manager.init() failed or skipped',
      err,
    );
  }

  try {
    const instance = await Promise.race([
      WC2Manager.getInstance(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Timed out waiting for WC2Manager.getInstance() to resolve',
              ),
            ),
          5000,
        ),
      ),
    ]);

    DevLogger.log('[wc][connectWithWC] instance ready, calling connect');
    await instance.connect({
      wcUri: wcURL,
      origin,
      redirectUrl: params?.redirect,
    });
  } catch (err) {
    DevLogger.log('[wc][connectWithWC] failed', err);
  }
}

export default connectWithWC;
