import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import ReduxService from '../../../../core/redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import Logger from '../../../../util/Logger';

interface HandleRampReturnUrlParams {
  rampReturnPath: string;
}

interface RampReturnNavigationParams {
  orderId?: string;
  showCloseButton: true;
  callbackUrl?: string;
  providerCode?: string;
  walletAddress?: string;
}

/**
 * Selected account address for the callback fetch. Deeplinks can arrive before
 * the store is ready, and a missing wallet must not block navigation.
 */
function readSelectedWalletAddress(): string | undefined {
  try {
    return (
      selectSelectedInternalAccountAddress(ReduxService.store.getState()) ||
      undefined
    );
  } catch (error) {
    Logger.error(error as Error, {
      message: 'handleRampReturnUrl: unable to read selected wallet',
    });
    return undefined;
  }
}

/**
 * Providers redirect to `metamask://on-ramp/...`. Relative paths are what the
 * universal-link handler forwards; rebuild that callback URL so order details
 * can resolve the order the same way as the iOS in-app browser return.
 */
function buildCallbackUrl(rampReturnPath: string): string | undefined {
  if (!rampReturnPath) {
    return undefined;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(rampReturnPath)) {
    return rampReturnPath;
  }
  if (rampReturnPath.startsWith('/')) {
    return `metamask://on-ramp${rampReturnPath}`;
  }
  if (rampReturnPath.startsWith('?')) {
    return `metamask://on-ramp/${rampReturnPath}`;
  }
  return `metamask://on-ramp/${rampReturnPath}`;
}

function readProviderCode(pathname: string): string | undefined {
  const match = pathname.match(/\/providers\/([^/]+)/);
  const providerCode = match?.[1];
  if (!providerCode) {
    return undefined;
  }
  try {
    return decodeURIComponent(providerCode);
  } catch {
    return providerCode;
  }
}

export default function handleRampReturnUrl({
  rampReturnPath,
}: HandleRampReturnUrlParams) {
  try {
    const parsed = new URL(rampReturnPath, 'https://placeholder.local');
    const orderId = parsed.searchParams.get('orderId') ?? undefined;
    const providerCode = readProviderCode(parsed.pathname);
    const walletAddress = readSelectedWalletAddress();
    const callbackUrl = buildCallbackUrl(rampReturnPath);
    const params: RampReturnNavigationParams = {
      orderId,
      showCloseButton: true,
    };

    if (callbackUrl) {
      params.callbackUrl = callbackUrl;
    }
    if (providerCode) {
      params.providerCode = providerCode;
    }
    if (walletAddress) {
      params.walletAddress = walletAddress;
    }

    NavigationService.navigation.navigate(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      params,
    );
  } catch (error) {
    Logger.error(error as Error, {
      message: 'Error in handleRampReturnUrl',
      rampReturnPath,
    });
  }
}
