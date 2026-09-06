import type { Hex } from '@metamask/utils';
import Routes from '../../../../constants/navigation/Routes';
import { handleQRScanSuccess } from '../../../../components/hooks/useQRScanner/handleQRScanSuccess';
import {
  ChainType,
  type PredefinedRecipient,
} from '../../../../components/Views/confirmations/utils/send';
import {
  getConnectedDappByTabId,
  getPendingQuickActionClipboard,
  QUICK_ACTION_FALLBACKS,
} from '../../../QuickActions';
import ReduxService from '../../../redux';
import NavigationService from '../../../NavigationService';
import type { AppNavigationProp } from '../../../NavigationService/types';
import { isValidHexAddress } from '../../../../util/address';
import {
  selectResolvedSelectedAccountGroup,
  selectSelectedAccountGroupEvmInternalAccount,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  selectEvmChainId,
  selectNickname,
} from '../../../../selectors/networkController';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';
import { createSwapDeeplinkIntent } from './handleSwapUrl';
import { createMoneyDeeplinkIntent } from '../legacy/handleMoney';

type QuickActionName = 'qr' | 'scan' | 'swap' | 'contextual';

const walletIntent = (): DeeplinkIntent => ({
  target: { type: 'home-tab', routeName: Routes.WALLET.HOME },
});

const getActionName = (actionPath: string): QuickActionName | null => {
  const action = actionPath.split('?')[0].replace(/^\/+/u, '').split('/')[0];
  return action === 'qr' ||
    action === 'scan' ||
    action === 'swap' ||
    action === 'contextual'
    ? action
    : null;
};

const createQrIntent = (): DeeplinkIntent => {
  const state = ReduxService.store.getState();
  const account = selectSelectedAccountGroupEvmInternalAccount(state);
  const accountGroup = selectResolvedSelectedAccountGroup(state);
  const chainId = selectEvmChainId(state) as Hex;
  const networkName = selectNickname(state) || 'Unknown Network';

  if (!account || !accountGroup || !chainId) {
    return walletIntent();
  }

  return {
    target: {
      type: 'main-stack',
      routeName: Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      params: {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: {
          address: account.address,
          networkName,
          chainId,
          groupId: accountGroup.id,
          location: 'ios-quick-action',
          account,
        },
      },
    },
  };
};

const createScanIntent = (): DeeplinkIntent => ({
  target: {
    type: 'main-stack',
    routeName: Routes.QR_TAB_SWITCHER,
    params: {
      onScanSuccess: (
        data: { private_key?: string; seed?: string },
        content?: string,
      ) =>
        handleQRScanSuccess({
          data,
          content,
          navigation: NavigationService.navigation as AppNavigationProp,
        }),
    },
  },
});

const createSendIntent = (address: string): DeeplinkIntent => {
  const predefinedRecipient: PredefinedRecipient = {
    address,
    chainType: ChainType.EVM,
  };

  return {
    target: {
      type: 'main-stack',
      routeName: Routes.SEND.DEFAULT,
      params: {
        screen: Routes.SEND.ASSET,
        params: {
          location: 'ios-quick-action',
          predefinedRecipient,
        },
      },
    },
  };
};

const createContextualIntent = async (
  actionUrl: string,
): Promise<DeeplinkIntent> => {
  const clipboard = await getPendingQuickActionClipboard();
  if (clipboard && isValidHexAddress(clipboard)) {
    return createSendIntent(clipboard);
  }

  const url = new URL(actionUrl);
  const fallback = url.searchParams.get('fallback');
  const tabId = url.searchParams.get('tabId');
  const connectedDapp =
    tabId && getConnectedDappByTabId(ReduxService.store.getState(), tabId);
  if (fallback === QUICK_ACTION_FALLBACKS.DAPP && connectedDapp) {
    return {
      target: {
        type: 'home-tab',
        routeName: Routes.BROWSER.HOME,
        params: {
          screen: Routes.BROWSER.VIEW,
          params: { existingTabId: connectedDapp.navigationTabId },
        },
      },
    };
  }

  return createMoneyDeeplinkIntent();
};

export const createQuickActionDeeplinkIntent = async ({
  actionPath,
  actionUrl,
}: {
  actionPath: string;
  actionUrl: string;
}): Promise<DeeplinkIntent | null> => {
  switch (getActionName(actionPath)) {
    case 'qr':
      return createQrIntent();
    case 'scan':
      return createScanIntent();
    case 'swap':
      return createSwapDeeplinkIntent({ swapPath: '' });
    case 'contextual':
      return createContextualIntent(actionUrl);
    default:
      return null;
  }
};

export const handleQuickActionUrl = async (params: {
  actionPath: string;
  actionUrl: string;
}) => {
  const intent = await createQuickActionDeeplinkIntent(params);
  if (intent) {
    await executeDeeplinkIntent(intent);
  }
};
