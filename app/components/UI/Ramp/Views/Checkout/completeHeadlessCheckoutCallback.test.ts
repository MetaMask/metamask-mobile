import type { RampsOrder } from '@metamask/ramps-controller';
import { RampsOrderStatus as Status } from '@metamask/ramps-controller';
import { protectWalletModalVisible } from '../../../../../actions/user';
import {
  emitOrderConfirmedAnalyticsFromCallback,
  emitTerminalOrderAnalyticsFromCallback,
} from '../../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics';
import Logger from '../../../../../util/Logger';
import { closeSession } from '../../headless/sessionRegistry';
import type { HeadlessSession } from '../../headless/types';
import { completeHeadlessCheckoutCallback } from './completeHeadlessCheckoutCallback';

const mockGetOrderFromCallback = jest.fn();
const mockAddOrder = jest.fn();
const mockDispatch = jest.fn();
const mockDismissActiveHeadlessFlow = jest.fn();
const mockOnTerminated = jest.fn();
const mockOnCloseSourceSuccess = jest.fn();

jest.mock('../../../../../actions/user', () => ({
  protectWalletModalVisible: jest.fn(() => ({
    type: 'PROTECT_WALLET_MODAL_VISIBLE',
  })),
}));

jest.mock(
  '../../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics',
  () => ({
    emitOrderConfirmedAnalyticsFromCallback: jest.fn(),
    emitTerminalOrderAnalyticsFromCallback: jest.fn(),
    isTerminalOrderStatus: jest.fn(() => false),
  }),
);

jest.mock(
  '../../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry',
  () => ({
    setHeadlessOrderContext: jest.fn(),
  }),
);

jest.mock('../../headless/sessionRegistry', () => ({
  closeSession: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const createMockOrder = (overrides: Partial<RampsOrder> = {}): RampsOrder =>
  ({
    isOnlyLink: false,
    id: 'order-1',
    providerOrderId: 'order-1',
    status: Status.Pending,
    fiatAmount: '100',
    cryptoAmount: '0.5',
    exchangeRate: '200',
    totalFeesFiat: '5',
    region: 'US',
    walletAddress: '0xabc',
    orderType: 'BUY',
    ...overrides,
  }) as RampsOrder;

const createSession = (): HeadlessSession => ({
  id: 'hs-1',
  status: 'continued',
  params: { rampSurface: 'money_account' } as HeadlessSession['params'],
  callbacks: {
    onOrderCreated: jest.fn(),
    onError: jest.fn(),
    onClose: jest.fn(),
  },
  createdAt: Date.now(),
});

describe('completeHeadlessCheckoutCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrderFromCallback.mockResolvedValue(createMockOrder());
  });

  it('returns false when there is no headless session', async () => {
    const result = await completeHeadlessCheckoutCallback({
      headlessSessionId: undefined,
      session: null,
      providerCode: 'transak',
      callbackUrl: 'https://callback.test',
      walletAddress: '0xabc',
      headlessRampSurface: 'money_account',
      regionCode: 'US',
      getOrderFromCallback: mockGetOrderFromCallback,
      addOrder: mockAddOrder,
      dispatch: mockDispatch,
      dismissActiveHeadlessFlow: mockDismissActiveHeadlessFlow,
      onHeadlessSessionTerminated: mockOnTerminated,
      onCallbackSuccessCloseSource: mockOnCloseSourceSuccess,
    });

    expect(result).toBe(false);
    expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
  });

  it('emits Confirmed, notifies consumer, and tears down the session', async () => {
    const session = createSession();

    const result = await completeHeadlessCheckoutCallback({
      headlessSessionId: 'hs-1',
      session,
      providerCode: 'transak',
      callbackUrl: 'https://callback.test',
      walletAddress: '0xabc',
      headlessRampSurface: 'money_account',
      regionCode: 'US',
      getOrderFromCallback: mockGetOrderFromCallback,
      addOrder: mockAddOrder,
      dispatch: mockDispatch,
      dismissActiveHeadlessFlow: mockDismissActiveHeadlessFlow,
      onHeadlessSessionTerminated: mockOnTerminated,
      onCallbackSuccessCloseSource: mockOnCloseSourceSuccess,
    });

    expect(result).toBe(true);
    expect(emitOrderConfirmedAnalyticsFromCallback).toHaveBeenCalledWith(
      expect.objectContaining({ providerOrderId: 'order-1' }),
      expect.objectContaining({
        rampType: 'HEADLESS',
        rampSurface: 'money_account',
        region: 'US',
      }),
    );
    expect(session.callbacks.onOrderCreated).toHaveBeenCalledWith('order-1');
    expect(closeSession).toHaveBeenCalledWith('hs-1', { reason: 'completed' });
    expect(mockOnTerminated).toHaveBeenCalled();
    expect(mockOnCloseSourceSuccess).toHaveBeenCalled();
    expect(mockDismissActiveHeadlessFlow).toHaveBeenCalled();
  });
});
