import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ToastService from '../../../../core/ToastService/ToastService';
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

describe('useNeobankSandboxDepositEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    useSelectorMock
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({
        activeVendor: 'iron',
        moonpayCustomerId: 'customer-1',
      });
  });

  it('shows success for Completed without calling a vault action', () => {
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

  it('ignores duplicate Completed events', () => {
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
