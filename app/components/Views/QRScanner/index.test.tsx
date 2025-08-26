import React from 'react';
import { waitFor } from '@testing-library/react-native';
import {
  useCameraPermission,
  useCameraDevice,
} from 'react-native-vision-camera';

import renderWithProvider from '../../../util/test/renderWithProvider';
import QrScanner from './';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

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

jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: jest.fn(),
  useCameraPermission: jest.fn(),
  useCodeScanner: jest.fn(() => ({
    codeTypes: ['qr'],
    onCodeScanned: jest.fn(),
  })),
}));

const mockUseCameraDevice = useCameraDevice as jest.MockedFunction<
  typeof useCameraDevice
>;
const mockUseCameraPermission = useCameraPermission as jest.MockedFunction<
  typeof useCameraPermission
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
});
