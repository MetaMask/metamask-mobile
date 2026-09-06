import { AppState, NativeModules, Platform } from 'react-native';
import UrlParser from 'url-parse';
import { strings } from '../../../locales/i18n';
import { RootState } from '../../reducers';
import { selectExistingUser } from '../../reducers/user';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../selectors/multichainAccounts/accountTreeController';
import { selectPermissionControllerState } from '../../selectors/snaps/permissionController';
import { isValidHexAddress } from '../../util/address';
import Logger from '../../util/Logger';
import ClipboardManager from '../ClipboardManager';
import { getPermittedCaipAccountIdsByHostname } from '../Permissions';
import ReduxService from '../redux';

export const QUICK_ACTION_TYPES = {
  QR: 'io.metamask.quick-action.qr',
  SCAN: 'io.metamask.quick-action.scan',
  SWAP: 'io.metamask.quick-action.swap',
  CONTEXTUAL: 'io.metamask.quick-action.contextual',
} as const;

export const QUICK_ACTION_FALLBACKS = {
  DAPP: 'dapp',
  MONEY: 'money',
} as const;

interface BrowserTab {
  id: string | number;
  url?: string;
  lastActiveAt?: number;
}

export interface ConnectedDappShortcut {
  hostname: string;
  tabId: string;
}

export interface ConnectedDappTab extends ConnectedDappShortcut {
  navigationTabId: string | number;
}

interface NativeShortcutItem {
  type: (typeof QUICK_ACTION_TYPES)[keyof typeof QUICK_ACTION_TYPES];
  title: string;
  subtitle?: string;
  systemImageName: string;
  userInfo?: Record<string, string>;
}

interface QuickActionsNativeModule {
  setShortcutItems(items: NativeShortcutItem[]): void;
  clearShortcutItems(): void;
  consumePendingClipboard(): Promise<string | null>;
}

const nativeQuickActions = NativeModules.QuickActions as
  | QuickActionsNativeModule
  | undefined;

const getTabOrigin = (tab: BrowserTab): string | null => {
  if (!tab.url) {
    return null;
  }

  const parsedUrl = new UrlParser(tab.url);
  return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
    ? parsedUrl.origin
    : null;
};

export const getConnectedDappByTabId = (
  state: RootState,
  tabId: string,
): ConnectedDappTab | null => {
  const tab = ((state.browser.tabs as BrowserTab[]) ?? []).find(
    (candidate) => String(candidate.id) === tabId,
  );
  const origin = tab && getTabOrigin(tab);
  if (!tab || !origin) {
    return null;
  }

  const permissionState = selectPermissionControllerState(state);
  if (!permissionState?.subjects) {
    return null;
  }
  return getPermittedCaipAccountIdsByHostname(permissionState, origin).length >
    0
    ? {
        hostname: new UrlParser(origin).hostname,
        tabId: String(tab.id),
        navigationTabId: tab.id,
      }
    : null;
};

export const findLastConnectedDapp = (
  state: RootState,
): ConnectedDappShortcut | null => {
  const tabs = (state.browser.tabs as BrowserTab[]) ?? [];
  const activeTabId = state.browser.activeTab;
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const remainingTabs = tabs
    .filter((tab) => tab.id !== activeTabId)
    .sort((a, b) => (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0));
  const permissionState = selectPermissionControllerState(state);
  if (!permissionState?.subjects) {
    return null;
  }

  for (const tab of activeTab ? [activeTab, ...remainingTabs] : remainingTabs) {
    const origin = getTabOrigin(tab);
    if (
      origin &&
      getPermittedCaipAccountIdsByHostname(permissionState, origin).length > 0
    ) {
      return {
        hostname: new UrlParser(origin).hostname,
        tabId: String(tab.id),
      };
    }
  }

  return null;
};

export const getPendingQuickActionClipboard = async (): Promise<string> =>
  (await nativeQuickActions?.consumePendingClipboard())?.trim() ?? '';

export const createShortcutItems = ({
  clipboard,
  connectedDapp,
}: {
  clipboard: string;
  connectedDapp: ConnectedDappShortcut | null;
}): NativeShortcutItem[] => {
  const fallbackUserInfo: Record<string, string> = connectedDapp
    ? {
        fallback: QUICK_ACTION_FALLBACKS.DAPP,
        tabId: connectedDapp.tabId,
      }
    : { fallback: QUICK_ACTION_FALLBACKS.MONEY };
  const contextualItem: NativeShortcutItem =
    clipboard.length > 0 && isValidHexAddress(clipboard)
      ? {
          type: QUICK_ACTION_TYPES.CONTEXTUAL,
          title: strings('quick_actions.send'),
          systemImageName: 'paperplane',
          userInfo: fallbackUserInfo,
        }
      : connectedDapp
        ? {
            type: QUICK_ACTION_TYPES.CONTEXTUAL,
            title: strings('quick_actions.open'),
            subtitle: connectedDapp.hostname,
            systemImageName: 'safari',
            userInfo: fallbackUserInfo,
          }
        : {
            type: QUICK_ACTION_TYPES.CONTEXTUAL,
            title: strings('quick_actions.money'),
            systemImageName: 'dollarsign.circle',
            userInfo: fallbackUserInfo,
          };

  return [
    {
      type: QUICK_ACTION_TYPES.QR,
      title: strings('quick_actions.show_qr_code'),
      systemImageName: 'qrcode',
    },
    {
      type: QUICK_ACTION_TYPES.SCAN,
      title: strings('quick_actions.scan_qr_code'),
      systemImageName: 'qrcode.viewfinder',
    },
    {
      type: QUICK_ACTION_TYPES.SWAP,
      title: strings('quick_actions.swap'),
      systemImageName: 'arrow.triangle.2.circlepath',
    },
    contextualItem,
  ];
};

class QuickActionsService {
  private appStateSubscription?: ReturnType<typeof AppState.addEventListener>;
  private refreshSequence = 0;

  start() {
    if (
      Platform.OS !== 'ios' ||
      !nativeQuickActions ||
      this.appStateSubscription
    ) {
      return;
    }

    this.appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'inactive') {
        this.refreshSafely(true);
      }
    });
    this.refreshSafely(false);
  }

  private refreshSafely(readClipboard: boolean) {
    this.refresh(readClipboard).catch((error) => {
      Logger.error(error as Error, 'QuickActionsService: Failed to refresh');
    });
  }

  async refresh(readClipboard: boolean) {
    const sequence = ++this.refreshSequence;
    const state = ReduxService.store.getState();
    const hasWallet =
      selectExistingUser(state) &&
      Boolean(selectSelectedAccountGroupEvmInternalAccount(state));

    if (!hasWallet) {
      nativeQuickActions?.clearShortcutItems();
      return;
    }

    let clipboard = '';
    if (readClipboard) {
      try {
        clipboard = (await ClipboardManager.getString()).trim();
      } catch (error) {
        Logger.error(
          error as Error,
          'QuickActionsService: Failed to read clipboard',
        );
      }
    }

    if (sequence !== this.refreshSequence) {
      return;
    }

    const connectedDapp = findLastConnectedDapp(ReduxService.store.getState());
    nativeQuickActions?.setShortcutItems(
      createShortcutItems({ clipboard, connectedDapp }),
    );
  }

  cleanup() {
    this.appStateSubscription?.remove();
    this.appStateSubscription = undefined;
  }
}

export default new QuickActionsService();
