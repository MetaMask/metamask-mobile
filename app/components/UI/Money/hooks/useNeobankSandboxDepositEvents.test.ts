import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import ToastService from '../../../../core/ToastService/ToastService';
import { selectMoneyMovementBrazilNeobankEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { useNeobankSandboxDepositEvents } from './useNeobankSandboxDepositEvents';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/ToastService/ToastService', () => ({
  showToast: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyMovementBrazilNeobankEnabled: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      resolveAutorampCustomerId: jest.fn(),
    },
  },
}));

const useSelectorMock = jest.mocked(useSelector);
const showToastMock = jest.mocked(ToastService.showToast);
const resolveAutorampCustomerIdMock = jest.mocked(
  Engine.context.RampsController.resolveAutorampCustomerId,
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

describe('useNeobankSandboxDepositEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectMoneyMovementBrazilNeobankEnabled) {
        return true;
      }
      return undefined;
    });
    resolveAutorampCustomerIdMock.mockResolvedValue('customer-1');
  });

  it('shows success for Completed without calling a vault action', async () => {
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
  });

  it('does not open a socket when customer id resolution fails', async () => {
    resolveAutorampCustomerIdMock.mockRejectedValue(new Error('not signed in'));

    renderHook(() => useNeobankSandboxDepositEvents());

    await waitFor(() => {
      expect(resolveAutorampCustomerIdMock).toHaveBeenCalled();
    });

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('ignores duplicate Completed events', async () => {
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
