import { waitFor } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useParams } from '../../../../../util/navigation/navUtils';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { useInitialRecipient } from './useInitialRecipient';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

describe('useInitialRecipient', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when recipientAddress is provided in params', () => {
    const recipientAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';

    it('should call updateTo with recipientAddress when to is not set', async () => {
      const mockUpdateTo = jest.fn();

      mockUseParams.mockReturnValue({ recipientAddress });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledWith(recipientAddress);
      });
    });

    it('should call updateTo with recipientAddress when to is empty string', async () => {
      const mockUpdateTo = jest.fn();

      mockUseParams.mockReturnValue({ recipientAddress });
      mockUseSendContext.mockReturnValue({
        to: '',
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledWith(recipientAddress);
      });
    });

    it('should not call updateTo when to is already set', async () => {
      const mockUpdateTo = jest.fn();
      const existingRecipient = '0x1234567890123456789012345678901234567890';

      mockUseParams.mockReturnValue({ recipientAddress });
      mockUseSendContext.mockReturnValue({
        to: existingRecipient,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        expect(mockUpdateTo).not.toHaveBeenCalled();
      });
    });
  });

  describe('when recipientAddress is not provided in params', () => {
    it('should not call updateTo when recipientAddress is undefined', async () => {
      const mockUpdateTo = jest.fn();

      mockUseParams.mockReturnValue({ recipientAddress: undefined });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        expect(mockUpdateTo).not.toHaveBeenCalled();
      });
    });

    it('should not call updateTo when recipientAddress is empty string', async () => {
      const mockUpdateTo = jest.fn();

      mockUseParams.mockReturnValue({ recipientAddress: '' });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        expect(mockUpdateTo).not.toHaveBeenCalled();
      });
    });

    it('should not call updateTo when params are empty object', async () => {
      const mockUpdateTo = jest.fn();

      mockUseParams.mockReturnValue({});
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        expect(mockUpdateTo).not.toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle multiple renders without calling updateTo multiple times', async () => {
      const mockUpdateTo = jest.fn();
      const recipientAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';

      mockUseParams.mockReturnValue({ recipientAddress });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      const { rerender } = renderHookWithProvider(
        () => useInitialRecipient(),
        mockState,
      );

      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledWith(recipientAddress);
      });

      // Simulate context update after updateTo is called
      mockUseSendContext.mockReturnValue({
        to: recipientAddress,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      // Re-render the hook
      rerender({} as never);

      // Should still only have been called once
      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle different address formats', async () => {
      const mockUpdateTo = jest.fn();
      const testCases = [
        '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576', // Checksummed
        '0x97a5b8a38f376b8a0c3c16e0a927b5b02def0576', // Lowercase
        '0x97A5B8A38F376B8A0C3C16E0A927B5B02DEF0576', // Uppercase
      ];

      for (const address of testCases) {
        mockUpdateTo.mockClear();
        mockUseParams.mockReturnValue({ recipientAddress: address });
        mockUseSendContext.mockReturnValue({
          to: undefined,
          updateTo: mockUpdateTo,
        } as unknown as ReturnType<typeof useSendContext>);

        renderHookWithProvider(() => useInitialRecipient(), mockState);

        await waitFor(() => {
          expect(mockUpdateTo).toHaveBeenCalledWith(address);
        });
      }
    });

    it('should handle Solana addresses', async () => {
      const mockUpdateTo = jest.fn();
      const solanaAddress = 'B43FvNL8mjXEr7MnVJ2k3CtHj3gzJmXq6JKBW7P7pYYT';

      mockUseParams.mockReturnValue({ recipientAddress: solanaAddress });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledWith(solanaAddress);
      });
    });

    it('should handle Bitcoin addresses', async () => {
      const mockUpdateTo = jest.fn();
      const bitcoinAddress = '128Lkh3S7CkDTBZ8m4JAz5YUaGZR6YrU6C';

      mockUseParams.mockReturnValue({ recipientAddress: bitcoinAddress });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledWith(bitcoinAddress);
      });
    });
  });

  describe('QR scanner integration scenarios', () => {
    it('should work when navigated from QR scanner with EVM address', async () => {
      const mockUpdateTo = jest.fn();
      const scannedAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      // Simulating navigation from QR scanner
      mockUseParams.mockReturnValue({ recipientAddress: scannedAddress });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledWith(scannedAddress);
        expect(mockUpdateTo).toHaveBeenCalledTimes(1);
      });
    });

    it('should not override user-entered address', async () => {
      const mockUpdateTo = jest.fn();
      const scannedAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const userEnteredAddress = '0x1234567890123456789012345678901234567890';

      // User has already entered an address manually
      mockUseParams.mockReturnValue({ recipientAddress: scannedAddress });
      mockUseSendContext.mockReturnValue({
        to: userEnteredAddress,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      renderHookWithProvider(() => useInitialRecipient(), mockState);

      await waitFor(() => {
        // Should not override existing address
        expect(mockUpdateTo).not.toHaveBeenCalled();
      });
    });
  });

  describe('useEffect dependency behavior', () => {
    it('should update when recipientAddress changes in params', async () => {
      const mockUpdateTo = jest.fn();
      const firstAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const secondAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';

      mockUseParams.mockReturnValue({ recipientAddress: firstAddress });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      const { rerender } = renderHookWithProvider(
        () => useInitialRecipient(),
        mockState,
      );

      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledWith(firstAddress);
      });

      // Update params to new address
      mockUseParams.mockReturnValue({ recipientAddress: secondAddress });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      rerender({} as never);

      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledWith(secondAddress);
        expect(mockUpdateTo).toHaveBeenCalledTimes(2);
      });
    });

    it('should not call updateTo again if to changes but recipientAddress stays same', async () => {
      const mockUpdateTo = jest.fn();
      const recipientAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';

      mockUseParams.mockReturnValue({ recipientAddress });
      mockUseSendContext.mockReturnValue({
        to: undefined,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      const { rerender } = renderHookWithProvider(
        () => useInitialRecipient(),
        mockState,
      );

      await waitFor(() => {
        expect(mockUpdateTo).toHaveBeenCalledWith(recipientAddress);
      });

      // Context updates (user made changes)
      mockUseSendContext.mockReturnValue({
        to: recipientAddress,
        updateTo: mockUpdateTo,
      } as unknown as ReturnType<typeof useSendContext>);

      rerender({} as never);

      await waitFor(() => {
        // Should not call again since to is now set
        expect(mockUpdateTo).toHaveBeenCalledTimes(1);
      });
    });
  });
});
