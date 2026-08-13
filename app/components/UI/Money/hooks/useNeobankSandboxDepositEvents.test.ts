import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ToastService from '../../../../core/ToastService/ToastService';
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

const useSelectorMock = jest.mocked(useSelector);
const showToastMock = jest.mocked(ToastService.showToast);

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
  useSelectorMock.mockReturnValueOnce(true).mockReturnValueOnce(kycState);
}

describe('useNeobankSandboxDepositEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    delete process.env.NEOBANK_DEMO_CUSTOMER_ID;
  });

  it('shows success for Completed without calling a vault action', () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: 'customer-1' });
    renderHook(() => useNeobankSandboxDepositEvents());

    const socket = MockWebSocket.instances[0];
    expect(socket.url).toContain('userId=customer-1');

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
  });

  it('falls back to the demo customer id when moonpayCustomerId is null', () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: null });
    renderHook(() => useNeobankSandboxDepositEvents());

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();
    expect(socket.url).toContain(`userId=${DEMO_NEOBANK_CUSTOMER_ID}`);
  });

  it('prefers the real moonpayCustomerId over the demo fallback', () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: 'real-customer' });
    renderHook(() => useNeobankSandboxDepositEvents());

    const socket = MockWebSocket.instances[0];
    expect(socket.url).toContain('userId=real-customer');
    expect(socket.url).not.toContain(DEMO_NEOBANK_CUSTOMER_ID);
  });

  it('ignores duplicate Completed events', () => {
    mockSelectors({ activeVendor: 'iron', moonpayCustomerId: 'customer-1' });
    renderHook(() => useNeobankSandboxDepositEvents());
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
