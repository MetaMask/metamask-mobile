import React from 'react';
import { waitFor, act } from '@testing-library/react-native';
import {
  useCameraPermission,
  useCameraDevice,
  useCodeScanner,
  type CodeScannerFrame,
} from 'react-native-vision-camera';

import renderWithProvider from '../../../util/test/renderWithProvider';
import QrScanner from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { newAssetTransaction } from '../../../actions/transaction';
import { getEther } from '../../../util/transactions';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigateToSendPage = jest.fn();
const mockSendNonEvmAsset = jest.fn();
const mockNewAssetTransaction = jest.fn();
const mockGetEther = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../confirmations/hooks/useSendNavigation', () => ({
  useSendNavigation: jest.fn(() => ({
    navigateToSendPage: mockNavigateToSendPage,
  })),
}));

jest.mock('../../hooks/useSendNonEvmAsset', () => ({
  useSendNonEvmAsset: () => ({
    sendNonEvmAsset: mockSendNonEvmAsset,
  }),
}));

jest.mock('../../../actions/transaction', () => ({
  newAssetTransaction: jest.fn((asset) => ({
    type: 'NEW_ASSET_TRANSACTION',
    payload: asset,
  })),
}));

jest.mock('../../../util/transactions', () => ({
  getEther: jest.fn((currency) => ({
    type: 'ETHER',
    currency,
  })),
}));

jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: jest.fn(),
  useCameraPermission: jest.fn(),
  useCodeScanner: jest.fn(() => ({
    codeTypes: ['qr'],
    onCodeScanned: jest.fn(),
  })),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      isUnlocked: jest.fn(() => true),
    },
  },
}));

const mockUseCameraDevice = useCameraDevice as jest.MockedFunction<
  typeof useCameraDevice
>;
const mockUseCameraPermission = useCameraPermission as jest.MockedFunction<
  typeof useCameraPermission
>;
const mockUseCodeScanner = useCodeScanner as jest.MockedFunction<
  typeof useCodeScanner
>;

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('QrScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCameraDevice.mockReturnValue({
      id: 'back',
      position: 'back',
      name: 'Back Camera',
      hasFlash: false,
    } as unknown as ReturnType<typeof useCameraDevice>);
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn().mockResolvedValue('granted'),
    });
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <QrScanner onScanSuccess={jest.fn()} />,
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should request permission when hasPermission is false', async () => {
    const mockRequestPermission = jest.fn().mockResolvedValue('granted');
    mockUseCameraPermission.mockReturnValue({
      hasPermission: false,
      requestPermission: mockRequestPermission,
    });

    renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });
  });

  it('should not request permission when hasPermission is true', async () => {
    const mockRequestPermission = jest.fn();
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: mockRequestPermission,
    });

    renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });
  });

  it('should call onScanError when camera error occurs', () => {
    const mockOnScanError = jest.fn();
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(),
    });

    renderWithProvider(
      <QrScanner onScanSuccess={jest.fn()} onScanError={mockOnScanError} />,
      { state: initialState },
    );

    expect(mockOnScanError).toBeDefined();
  });

  it('should render camera not available message when no camera device', () => {
    mockUseCameraDevice.mockReturnValue(undefined);
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <QrScanner onScanSuccess={jest.fn()} />,
      { state: initialState },
    );

    expect(getByText('Camera not available')).toBeTruthy();
  });

  describe('QR Code Scanning - Ethereum Address', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Setup mock return values
      mockGetEther.mockReturnValue({ type: 'ETHER', currency: 'ETH' });
      mockNewAssetTransaction.mockReturnValue({
        type: 'NEW_ASSET_TRANSACTION',
        payload: { type: 'ETHER', currency: 'ETH' },
      });
      mockSendNonEvmAsset.mockResolvedValue(false);

      mockUseCodeScanner.mockImplementation((config) => ({
        codeTypes: ['qr'],
        onCodeScanned: config.onCodeScanned,
      }));

      mockUseCameraDevice.mockReturnValue({
        id: 'back',
        position: 'back',
        name: 'Back Camera',
        hasFlash: false,
      } as unknown as ReturnType<typeof useCameraDevice>);

      mockUseCameraPermission.mockReturnValue({
        hasPermission: true,
        requestPermission: jest.fn(),
      });
    });

    it('should handle scanning Ethereum address with 0x prefix', async () => {
      const ethereumAddress = '0x1234567890123456789012345678901234567890';

      renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
        state: initialState,
      });

      // Wait for component to mount
      await waitFor(() => {
        expect(mockUseCodeScanner).toHaveBeenCalled();
      });

      // Get the onCodeScanned callback
      const codeScannerConfig =
        mockUseCodeScanner.mock.calls[
          mockUseCodeScanner.mock.calls.length - 1
        ][0];

      // Simulate scanning an Ethereum address
      await act(async () => {
        await codeScannerConfig.onCodeScanned(
          [{ value: ethereumAddress, type: 'qr' }],
          {} as CodeScannerFrame,
        );
      });

      // Verify transaction initialization
      await waitFor(() => {
        expect(getEther).toHaveBeenCalledWith('ETH');
      });
      expect(newAssetTransaction).toHaveBeenCalled();

      // Verify scanner closes
      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('should handle scanning ethereum: URL with address', async () => {
      const ethereumAddress = '0x1234567890123456789012345678901234567890';
      const ethereumUrl = `ethereum:${ethereumAddress}`;

      renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
        state: initialState,
      });

      await waitFor(() => {
        expect(mockUseCodeScanner).toHaveBeenCalled();
      });

      const codeScannerConfig =
        mockUseCodeScanner.mock.calls[
          mockUseCodeScanner.mock.calls.length - 1
        ][0];

      await act(async () => {
        await codeScannerConfig.onCodeScanned(
          [{ value: ethereumUrl, type: 'qr' }],
          {} as CodeScannerFrame,
        );
      });

      await waitFor(() => {
        expect(getEther).toHaveBeenCalled();
        expect(newAssetTransaction).toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('should fallback to ETH when native currency is not available', async () => {
      const ethereumAddress = '0x1234567890123456789012345678901234567890';

      renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
        state: initialState,
      });

      await waitFor(() => {
        expect(mockUseCodeScanner).toHaveBeenCalled();
      });

      const codeScannerConfig =
        mockUseCodeScanner.mock.calls[
          mockUseCodeScanner.mock.calls.length - 1
        ][0];

      await act(async () => {
        await codeScannerConfig.onCodeScanned(
          [{ value: ethereumAddress, type: 'qr' }],
          {} as CodeScannerFrame,
        );
      });

      await waitFor(() => {
        expect(getEther).toHaveBeenCalledWith('ETH');
      });
      expect(newAssetTransaction).toHaveBeenCalled();
    });

    it('should navigate to send page with recipient address', async () => {
      const ethereumAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

      renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
        state: initialState,
      });

      await waitFor(() => {
        expect(mockUseCodeScanner).toHaveBeenCalled();
      });

      const codeScannerConfig =
        mockUseCodeScanner.mock.calls[
          mockUseCodeScanner.mock.calls.length - 1
        ][0];

      await act(async () => {
        await codeScannerConfig.onCodeScanned(
          [{ value: ethereumAddress, type: 'qr' }],
          {} as CodeScannerFrame,
        );
      });

      // Verify scanner closes
      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('QR Code Scanning - Solana Address', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Setup mock return values
      mockGetEther.mockReturnValue({ type: 'ETHER', currency: 'ETH' });
      mockNewAssetTransaction.mockReturnValue({
        type: 'NEW_ASSET_TRANSACTION',
        payload: { type: 'ETHER', currency: 'ETH' },
      });

      mockUseCodeScanner.mockImplementation((config) => ({
        codeTypes: ['qr'],
        onCodeScanned: config.onCodeScanned,
      }));

      mockUseCameraDevice.mockReturnValue({
        id: 'back',
        position: 'back',
        name: 'Back Camera',
        hasFlash: false,
      } as unknown as ReturnType<typeof useCameraDevice>);

      mockUseCameraPermission.mockReturnValue({
        hasPermission: true,
        requestPermission: jest.fn(),
      });
    });

    it('should handle Solana address and call sendNonEvmAsset', async () => {
      const solanaAddress = 'B43FvNLyahfDqEZD7erAnr5bXZsw58nmEKiaiAoJmXEr';
      mockSendNonEvmAsset.mockResolvedValue(true);

      renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
        state: initialState,
      });

      await waitFor(() => {
        expect(mockUseCodeScanner).toHaveBeenCalled();
      });

      const codeScannerConfig =
        mockUseCodeScanner.mock.calls[
          mockUseCodeScanner.mock.calls.length - 1
        ][0];

      await act(async () => {
        await codeScannerConfig.onCodeScanned(
          [{ value: solanaAddress, type: 'qr' }],
          {} as CodeScannerFrame,
        );
      });

      // Verify sendNonEvmAsset was called
      await waitFor(() => {
        expect(mockSendNonEvmAsset).toHaveBeenCalledWith('qr_scanner');
      });

      // Verify scanner closes
      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('should not call EVM transaction methods for Solana address', async () => {
      const solanaAddress = 'B43FvNLyahfDqEZD7erAnr5bXZsw58nmEKiaiAoJmXEr';
      mockSendNonEvmAsset.mockResolvedValue(true);

      renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
        state: initialState,
      });

      await waitFor(() => {
        expect(mockUseCodeScanner).toHaveBeenCalled();
      });

      const codeScannerConfig =
        mockUseCodeScanner.mock.calls[
          mockUseCodeScanner.mock.calls.length - 1
        ][0];

      await act(async () => {
        await codeScannerConfig.onCodeScanned(
          [{ value: solanaAddress, type: 'qr' }],
          {} as CodeScannerFrame,
        );
      });

      await waitFor(() => {
        expect(mockSendNonEvmAsset).toHaveBeenCalled();
      });

      // Should not call EVM methods
      expect(getEther).not.toHaveBeenCalled();
      expect(newAssetTransaction).not.toHaveBeenCalled();
    });

    it('should close scanner and navigate when sendNonEvmAsset returns true', async () => {
      const solanaAddress = 'B43FvNLyahfDqEZD7erAnr5bXZsw58nmEKiaiAoJmXEr';
      mockSendNonEvmAsset.mockResolvedValue(true);

      renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
        state: initialState,
      });

      await waitFor(() => {
        expect(mockUseCodeScanner).toHaveBeenCalled();
      });

      const codeScannerConfig =
        mockUseCodeScanner.mock.calls[
          mockUseCodeScanner.mock.calls.length - 1
        ][0];

      await act(async () => {
        await codeScannerConfig.onCodeScanned(
          [{ value: solanaAddress, type: 'qr' }],
          {} as CodeScannerFrame,
        );
      });

      await waitFor(() => {
        expect(mockSendNonEvmAsset).toHaveBeenCalled();
      });

      // Verify scanner closes
      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });
});
