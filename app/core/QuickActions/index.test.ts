import type { RootState } from '../../reducers';
import {
  createShortcutItems,
  findLastConnectedDapp,
  getConnectedDappByTabId,
  QUICK_ACTION_FALLBACKS,
  QUICK_ACTION_TYPES,
} from './index';

jest.mock('../Permissions', () => ({
  getPermittedCaipAccountIdsByHostname: (_state: unknown, origin: string) =>
    origin === 'https://connected.example' ? ['eip155:1:0x1'] : [],
}));

const createState = ({
  activeTab,
  tabs,
}: {
  activeTab: string;
  tabs: {
    id: string;
    url: string;
    lastActiveAt: number;
  }[];
}) =>
  ({
    browser: { activeTab, tabs },
    engine: {
      backgroundState: {
        PermissionController: { subjects: {} },
      },
    },
  }) as unknown as RootState;

describe('QuickActions connected dapp selection', () => {
  it('prefers the active tab when it is connected', () => {
    const state = createState({
      activeTab: 'active',
      tabs: [
        {
          id: 'active',
          url: 'https://connected.example/app',
          lastActiveAt: 1,
        },
        {
          id: 'recent',
          url: 'https://connected.example/recent',
          lastActiveAt: 10,
        },
      ],
    });

    expect(findLastConnectedDapp(state)).toEqual({
      hostname: 'connected.example',
      tabId: 'active',
    });
  });

  it('falls back to the most recently active connected open tab', () => {
    const state = createState({
      activeTab: 'disconnected',
      tabs: [
        {
          id: 'disconnected',
          url: 'https://unconnected.example',
          lastActiveAt: 20,
        },
        {
          id: 'older',
          url: 'https://connected.example/older',
          lastActiveAt: 5,
        },
        {
          id: 'newer',
          url: 'https://connected.example/newer',
          lastActiveAt: 10,
        },
      ],
    });

    expect(findLastConnectedDapp(state)?.tabId).toBe('newer');
  });

  it('rejects a cached tab that is no longer connected', () => {
    const state = createState({
      activeTab: 'disconnected',
      tabs: [
        {
          id: 'disconnected',
          url: 'https://unconnected.example',
          lastActiveAt: 1,
        },
      ],
    });

    expect(getConnectedDappByTabId(state, 'disconnected')).toBeNull();
  });
});

describe('createShortcutItems', () => {
  it('always keeps the three fixed actions first', () => {
    const items = createShortcutItems({
      clipboard: '',
      connectedDapp: null,
    });

    expect(items.map(({ type }) => type)).toEqual([
      QUICK_ACTION_TYPES.QR,
      QUICK_ACTION_TYPES.SCAN,
      QUICK_ACTION_TYPES.SWAP,
      QUICK_ACTION_TYPES.CONTEXTUAL,
    ]);
  });

  it('shows Send for an EVM clipboard address while retaining the dapp fallback', () => {
    const items = createShortcutItems({
      clipboard: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      connectedDapp: {
        hostname: 'connected.example',
        tabId: 'tab-1',
      },
    });

    expect(items[3]).toMatchObject({
      type: QUICK_ACTION_TYPES.CONTEXTUAL,
      systemImageName: 'paperplane',
      userInfo: {
        fallback: QUICK_ACTION_FALLBACKS.DAPP,
        tabId: 'tab-1',
      },
    });
  });

  it('uses Money when neither clipboard nor a connected tab is available', () => {
    const items = createShortcutItems({
      clipboard: 'invalid',
      connectedDapp: null,
    });

    expect(items[3].userInfo).toEqual({
      fallback: QUICK_ACTION_FALLBACKS.MONEY,
    });
  });
});
