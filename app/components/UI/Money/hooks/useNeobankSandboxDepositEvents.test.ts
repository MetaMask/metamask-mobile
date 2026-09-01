import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import ToastService from '../../../../core/ToastService/ToastService';
import { selectMoneyMovementBrazilNeobankEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectKycControllerState } from '../../../../selectors/kycController';
import { getSessionProfileId } from '../../../../util/notifications/utils/get-session-profile-id';
import { DEMO_NEOBANK_CUSTOMER_ID } from '../utils/neobankEvents';
import { useNeobankSandboxDepositEvents } from './useNeobankSandboxDepositEvents';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/ToastService/ToastService', () => ({
  showToast: jest.fn(),
}));

jest.mock('../../../../selectors/kycController', () => ({
  selectKycControllerState: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyMovementBrazilNeobankEnabled: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    NeoBankService: {
      getCustomerByExternalId: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../../util/notifications/utils/get-session-profile-id',
  () => ({
    getSessionProfileId: jest.fn(),
  }),
);

const useSelectorMock = jest.mocked(useSelector);
const showToastMock = jest.mocked(ToastService.showToast);
const getSessionProfileIdMock = jest.mocked(getSessionProfileId);
const getCustomerByExternalIdMock = jest.mocked(
  Engine.context.NeoBankService.getCustomerByExternalId,
);

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly url: string;

  onmessage?: (event: { data: string }) => void;

  onerror?: () => void;

  onclose?: () => void;

  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
}

function mockSelectors(kycState: {
  activeVendor?: string;
  moonpayCustomerId?: string | null;
}) {
  // Re-renders after the async customer lookup call useSelector again, so the
  // mock must stay stable across the whole hook lifetime.
  useSelectorMock.mockImplementation((selector) => {
    if (selector === selectMoneyMovementBrazilNeobankEnabled) {
      return true;
    }
    if (selector === selectKycControllerState) {
      return kycState;
    }
    return undefined;
  });
}

describe('useNeobankSandboxDepositEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    delete process.env.NEOBANK_DEMO_CUSTOMER_ID;
    getSessionProfileIdMock.mockResolvedValue(undefined);
    getCustomerByExternalIdMock.mockResolvedValue(null);
  });

  it('shows success for Completed without calling a vault action', async () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: 'customer-1' });
    renderHook(() => useNeobankSandboxDepositEvents());

    await waitFor(() => {
      expect(MockWebSocket.instances[0]?.url).toContain('userId=customer-1');
    });

    const socket = MockWebSocket.instances[0];

    act(() => {
      socket.onmessage?.({
        data: JSON.stringify({
          eventId: 'event-1',
          type: 'transaction_status',
          payload: {
            data: {
              message: {
                TransactionStatus: {
                  id: 'sandbox-uuid',
                  transaction_status: 'Completed',
                },
              },
            },
          },
        }),
      });
    });

    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          expect.objectContaining({ label: 'Deposit successful' }),
        ],
      }),
    );
    expect(getCustomerByExternalIdMock).not.toHaveBeenCalled();
  });

  it('prefers the real moonpayCustomerId over lookup and demo fallback', async () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: 'real-customer' });
    renderHook(() => useNeobankSandboxDepositEvents());

    await waitFor(() => {
      expect(MockWebSocket.instances[0]?.url).toContain('userId=real-customer');
    });

    expect(MockWebSocket.instances[0].url).not.toContain(
      DEMO_NEOBANK_CUSTOMER_ID,
    );
    expect(getCustomerByExternalIdMock).not.toHaveBeenCalled();
  });

  it('uses the looked-up Iron customer id when moonpayCustomerId is unset', async () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: null });
    getSessionProfileIdMock.mockResolvedValue('profile-1');
    getCustomerByExternalIdMock.mockResolvedValue({
      id: 'looked-up-customer',
      external_id: 'profile-1',
    });

    renderHook(() => useNeobankSandboxDepositEvents());

    await waitFor(() => {
      expect(MockWebSocket.instances[0]?.url).toContain(
        'userId=looked-up-customer',
      );
    });

    expect(getCustomerByExternalIdMock).toHaveBeenCalledWith('profile-1');
    expect(MockWebSocket.instances[0].url).not.toContain(
      DEMO_NEOBANK_CUSTOMER_ID,
    );
  });

  it('falls back to the demo customer id when lookup fails', async () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: null });
    getSessionProfileIdMock.mockResolvedValue('profile-1');
    getCustomerByExternalIdMock.mockRejectedValue(new Error('network'));

    renderHook(() => useNeobankSandboxDepositEvents());

    await waitFor(() => {
      expect(MockWebSocket.instances[0]?.url).toContain(
        `userId=${DEMO_NEOBANK_CUSTOMER_ID}`,
      );
    });
  });

  it('falls back to the demo customer id when lookup returns nothing', async () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: null });
    getSessionProfileIdMock.mockResolvedValue(undefined);

    renderHook(() => useNeobankSandboxDepositEvents());

    await waitFor(() => {
      expect(MockWebSocket.instances[0]?.url).toContain(
        `userId=${DEMO_NEOBANK_CUSTOMER_ID}`,
      );
    });

    expect(getCustomerByExternalIdMock).not.toHaveBeenCalled();
  });

  it('ignores duplicate Completed events', async () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: 'customer-1' });
    renderHook(() => useNeobankSandboxDepositEvents());

    await waitFor(() => {
      expect(MockWebSocket.instances[0]).toBeDefined();
    });

    const socket = MockWebSocket.instances[0];
    const data = JSON.stringify({
      eventId: 'event-1',
      type: 'transaction_status',
      payload: {
        data: {
          message: {
            TransactionStatus: { transaction_status: 'Completed' },
          },
        },
      },
    });

    act(() => {
      socket.onmessage?.({ data });
      socket.onmessage?.({ data });
    });

    expect(showToastMock).toHaveBeenCalledTimes(1);
  });
});
