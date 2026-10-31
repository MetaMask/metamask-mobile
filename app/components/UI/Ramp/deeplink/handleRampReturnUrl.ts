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

function readSelectedWalletAddress(): string | undefined {
  try {
    return (
      selectSelectedInternalAccountAddress(ReduxService.store.getState()) ||
      undefined
    );
  } catch (error) {
    // ReduxService.store throws when unset. That must not reach the outer catch,
    // which skips navigation.
    Logger.error(error as Error, {
      message: 'handleRampReturnUrl: unable to read selected wallet',
    });
    return undefined;
  }
}

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
