import Routes from '../../../../constants/navigation/Routes';
import { createQuickActionDeeplinkIntent } from './handleQuickActionUrl';

const mockGetPendingClipboard = jest.fn();
const mockGetConnectedDappByTabId = jest.fn();
const mockCreateMoneyIntent = jest.fn();
const mockCreateSwapIntent = jest.fn();

jest.mock('../../../QuickActions', () => ({
  getPendingQuickActionClipboard: () => mockGetPendingClipboard(),
  getConnectedDappByTabId: (...args: unknown[]) =>
    mockGetConnectedDappByTabId(...args),
  QUICK_ACTION_FALLBACKS: { DAPP: 'dapp', MONEY: 'money' },
}));

jest.mock('../../../redux', () => ({
  store: { getState: () => ({}) },
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: () => ({
      id: 'account-id',
      address: '0x1234567890123456789012345678901234567890',
    }),
    selectResolvedSelectedAccountGroup: () => ({ id: 'group-id' }),
  }),
);

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmChainId: () => '0x1',
  selectNickname: () => 'Ethereum Mainnet',
}));

jest.mock('../legacy/handleMoney', () => ({
  createMoneyDeeplinkIntent: () => mockCreateMoneyIntent(),
}));

jest.mock('./handleSwapUrl', () => ({
  createSwapDeeplinkIntent: (...args: unknown[]) =>
    mockCreateSwapIntent(...args),
}));

jest.mock(
  '../../../../components/hooks/useQRScanner/handleQRScanSuccess',
  () => ({ handleQRScanSuccess: jest.fn() }),
);

describe('createQuickActionDeeplinkIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPendingClipboard.mockResolvedValue('');
    mockGetConnectedDappByTabId.mockReturnValue(null);
    mockCreateMoneyIntent.mockReturnValue({
      target: { type: 'home-tab', routeName: Routes.MONEY.ROOT },
    });
    mockCreateSwapIntent.mockResolvedValue({
      target: { type: 'main-stack', routeName: Routes.BRIDGE.ROOT },
    });
  });

  it('opens the selected EVM account QR code', async () => {
    const intent = await createQuickActionDeeplinkIntent({
      actionPath: '/qr',
      actionUrl: 'https://link.metamask.io/quick-action/qr',
    });

    expect(intent?.target).toMatchObject({
      type: 'main-stack',
      routeName: Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      params: {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: {
          address: '0x1234567890123456789012345678901234567890',
          networkName: 'Ethereum Mainnet',
          chainId: '0x1',
          groupId: 'group-id',
        },
      },
    });
  });

  it('opens the QR scanner with a scan callback', async () => {
    const intent = await createQuickActionDeeplinkIntent({
      actionPath: '/scan',
      actionUrl: 'https://link.metamask.io/quick-action/scan',
    });

    expect(intent?.target).toMatchObject({
      type: 'main-stack',
      routeName: Routes.QR_TAB_SWITCHER,
      params: { onScanSuccess: expect.any(Function) },
    });
  });

  it('reuses the swap deeplink intent', async () => {
    await createQuickActionDeeplinkIntent({
      actionPath: '/swap',
      actionUrl: 'https://link.metamask.io/quick-action/swap',
    });

    expect(mockCreateSwapIntent).toHaveBeenCalledWith({ swapPath: '' });
  });

  it('uses a valid tap-time EVM clipboard address for Send', async () => {
    const address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    mockGetPendingClipboard.mockResolvedValue(address);

    const intent = await createQuickActionDeeplinkIntent({
      actionPath: '/contextual?fallback=money',
      actionUrl:
        'https://link.metamask.io/quick-action/contextual?fallback=money',
    });

    expect(intent?.target).toMatchObject({
      routeName: Routes.SEND.DEFAULT,
      params: {
        screen: Routes.SEND.ASSET,
        params: {
          predefinedRecipient: { address, chainType: 'evm' },
        },
      },
    });
  });

  it('reopens a cached tab when clipboard is invalid and it remains connected', async () => {
    mockGetPendingClipboard.mockResolvedValue('not-an-address');
    mockGetConnectedDappByTabId.mockReturnValue({
      hostname: 'app.example',
      tabId: 'tab-1',
      navigationTabId: 42,
    });

    const intent = await createQuickActionDeeplinkIntent({
      actionPath: '/contextual?fallback=dapp&tabId=tab-1',
      actionUrl:
        'https://link.metamask.io/quick-action/contextual?fallback=dapp&tabId=tab-1',
    });

    expect(intent?.target).toEqual({
      type: 'home-tab',
      routeName: Routes.BROWSER.HOME,
      params: {
        screen: Routes.BROWSER.VIEW,
        params: { existingTabId: 42 },
      },
    });
  });

  it('falls back to the guarded Money intent', async () => {
    await createQuickActionDeeplinkIntent({
      actionPath: '/contextual?fallback=dapp&tabId=stale',
      actionUrl:
        'https://link.metamask.io/quick-action/contextual?fallback=dapp&tabId=stale',
    });

    expect(mockCreateMoneyIntent).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown actions', async () => {
    await expect(
      createQuickActionDeeplinkIntent({
        actionPath: '/unknown',
        actionUrl: 'https://link.metamask.io/quick-action/unknown',
      }),
    ).resolves.toBeNull();
  });
});
