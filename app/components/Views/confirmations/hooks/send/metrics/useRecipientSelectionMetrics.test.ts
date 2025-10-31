import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../../hooks/useMetrics';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useSendType } from '../useSendType';
import { useRecipientSelectionMetrics } from './useRecipientSelectionMetrics';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnValue({
    build: jest.fn().mockReturnValue({
      event: 'test_event',
      properties: {},
    }),
  }),
});

jest.mock('../../../../../hooks/useMetrics', () => ({
  ...jest.requireActual('../../../../../hooks/useMetrics'),
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../context/send-context/send-metrics-context', () => ({
  ...jest.requireActual('../../../context/send-context/send-metrics-context'),
  useSendMetricsContext: () => ({
    accountType: 'EOA',
    chainId: '0x1',
    chainIdCaip: 'eip155:1',
  }),
}));

jest.mock('../../../context/send-context', () => ({
  useSendContext: () => ({
    chainId: '0x1',
  }),
}));

jest.mock('../useSendType', () => ({
  useSendType: jest.fn(() => ({
    isEvmSendType: true,
  })),
}));

const mockUseSendType = useSendType as jest.MockedFunction<typeof useSendType>;

const mockState = {
  state: evmSendStateMock,
};

describe('useRecipientSelectionMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSendType.mockReturnValue({ isEvmSendType: true } as any);
  });

  describe('captureRecipientSelected', () => {
    it('tracks recipient selected event with EVM properties when called for EVM chain', async () => {
      const { result } = renderHookWithProvider(
        () => useRecipientSelectionMetrics(),
        mockState,
      );

      const expectedEventBuilder = {
        addProperties: jest.fn().mockReturnValue({
          build: jest.fn().mockReturnValue({ event: 'test_event' }),
        }),
      };
      mockCreateEventBuilder.mockReturnValue(expectedEventBuilder);

      await result.current.captureRecipientSelected('manual');

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SEND_RECIPIENT_SELECTED,
      );
      expect(expectedEventBuilder.addProperties).toHaveBeenCalledWith({
        account_type: 'EOA',
        input_method: 'manual',
        chain_id: '0x1',
        chain_id_caip: 'eip155:1',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'test_event' });
    });

    it('tracks recipient selected event with non-EVM properties when called for non-EVM chain', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseSendType.mockReturnValue({ isEvmSendType: false } as any);

      const { result } = renderHookWithProvider(
        () => useRecipientSelectionMetrics(),
        mockState,
      );

      const expectedEventBuilder = {
        addProperties: jest.fn().mockReturnValue({
          build: jest.fn().mockReturnValue({ event: 'test_event' }),
        }),
      };
      mockCreateEventBuilder.mockReturnValue(expectedEventBuilder);

      await result.current.captureRecipientSelected('manual');

      expect(expectedEventBuilder.addProperties).toHaveBeenCalledWith({
        account_type: 'EOA',
        input_method: 'manual',
        chain_id: '0x1',
        chain_id_caip: 'eip155:1',
      });
    });
  });

  describe('hook return values', () => {
    it('returns all expected functions', () => {
      const { result } = renderHookWithProvider(
        () => useRecipientSelectionMetrics(),
        mockState,
      );

      expect(typeof result.current.captureRecipientSelected).toBe('function');
    });
  });
});
