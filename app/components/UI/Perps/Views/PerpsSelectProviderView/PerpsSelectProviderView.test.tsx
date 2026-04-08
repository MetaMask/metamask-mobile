import React from 'react';
import { render, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import { usePerpsNetworkConfig } from '../../hooks/usePerpsNetworkConfig';
import PerpsSelectProviderView from './PerpsSelectProviderView';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

jest.mock('../../hooks/usePerpsNetworkConfig', () => ({
  usePerpsNetworkConfig: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Configurable option for the sheet mock — set per-test to drive onOptionSelect
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSheetOption: any = {
  id: 'myx-mainnet',
  providerId: 'myx',
  isTestnet: false,
  name: 'MYX',
  network: 'Mainnet',
  description: '',
};

// Mock the sheet component so we can inspect the props passed to it
jest.mock(
  '../../components/PerpsProviderSelector/PerpsProviderSelectorSheet',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      __esModule: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: ({ onClose, onOptionSelect, selectedOptionId, testID }: any) => (
        <View testID={testID}>
          <TouchableOpacity testID="btn-close" onPress={onClose} />
          <TouchableOpacity
            testID="btn-select-option"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => onOptionSelect(mockSheetOption)}
          />
          <Text testID="selected-option-id">{selectedOptionId}</Text>
        </View>
      ),
    };
  },
);

const mockGoBack = jest.fn();
const mockSwitchProvider = jest.fn();
const mockToggleTestnet = jest.fn();
const mockUseSelector = useSelector as jest.Mock;
const mockUsePerpsProvider = usePerpsProvider as jest.Mock;
const mockUsePerpsNetworkConfig = usePerpsNetworkConfig as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (useNavigation as jest.Mock).mockReturnValue({ goBack: mockGoBack });
  mockUseSelector.mockReturnValue('mainnet');
  mockUsePerpsProvider.mockReturnValue({
    activeProvider: 'hyperliquid',
    switchProvider: mockSwitchProvider,
  });
  mockUsePerpsNetworkConfig.mockReturnValue({
    toggleTestnet: mockToggleTestnet,
  });
  mockSwitchProvider.mockResolvedValue({ success: true });
  mockToggleTestnet.mockResolvedValue({ success: true });
  // Default: select myx (provider changes, no network change)
  mockSheetOption = {
    id: 'myx-mainnet',
    providerId: 'myx',
    isTestnet: false,
    name: 'MYX',
    network: 'Mainnet',
    description: '',
  };
});

describe('PerpsSelectProviderView', () => {
  it('renders the sheet with isVisible=true', () => {
    const { getByTestId } = render(<PerpsSelectProviderView />);

    expect(getByTestId('perps-select-provider-sheet')).toBeTruthy();
  });

  it('shows selectedOptionId as hyperliquid-mainnet by default', () => {
    const { getByTestId } = render(<PerpsSelectProviderView />);

    expect(getByTestId('selected-option-id').props.children).toBe(
      'hyperliquid-mainnet',
    );
  });

  it('shows testnet suffix when network is testnet', () => {
    mockUseSelector.mockReturnValue('testnet');

    const { getByTestId } = render(<PerpsSelectProviderView />);

    expect(getByTestId('selected-option-id').props.children).toBe(
      'hyperliquid-testnet',
    );
  });

  it('calls navigation.goBack when onClose is triggered', () => {
    const { getByTestId } = render(<PerpsSelectProviderView />);

    act(() => {
      getByTestId('btn-close').props.onPress();
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls switchProvider when provider changes', async () => {
    const { getByTestId } = render(<PerpsSelectProviderView />);

    await act(async () => {
      getByTestId('btn-select-option').props.onPress();
    });

    expect(mockSwitchProvider).toHaveBeenCalledWith('myx');
  });

  it('does not call switchProvider or toggleTestnet when nothing changes', async () => {
    // Same provider, same network → no-op
    mockSheetOption = {
      id: 'hyperliquid-mainnet',
      providerId: 'hyperliquid',
      isTestnet: false,
      name: 'HyperLiquid',
      network: 'Mainnet',
      description: '',
    };

    const { getByTestId } = render(<PerpsSelectProviderView />);

    await act(async () => {
      getByTestId('btn-select-option').props.onPress();
    });

    expect(mockSwitchProvider).not.toHaveBeenCalled();
    expect(mockToggleTestnet).not.toHaveBeenCalled();
  });

  it('calls toggleTestnet when only network changes (same provider)', async () => {
    // Same provider, different network → only toggleTestnet
    mockSheetOption = {
      id: 'hyperliquid-testnet',
      providerId: 'hyperliquid',
      isTestnet: true,
      name: 'HyperLiquid',
      network: 'Testnet',
      description: '',
    };

    const { getByTestId } = render(<PerpsSelectProviderView />);

    await act(async () => {
      getByTestId('btn-select-option').props.onPress();
    });

    expect(mockSwitchProvider).not.toHaveBeenCalled();
    expect(mockToggleTestnet).toHaveBeenCalled();
  });

  it('logs error when switchProvider fails', async () => {
    const Logger = jest.requireMock('../../../../../util/Logger');
    mockSwitchProvider.mockResolvedValue({
      success: false,
      error: 'Switch failed',
    });

    const { getByTestId } = render(<PerpsSelectProviderView />);

    await act(async () => {
      getByTestId('btn-select-option').props.onPress();
    });

    expect(Logger.error).toHaveBeenCalled();
  });

  it('logs error when toggleTestnet fails', async () => {
    const Logger = jest.requireMock('../../../../../util/Logger');
    mockToggleTestnet.mockResolvedValue({
      success: false,
      error: 'Toggle failed',
    });

    // Network-only change: same provider, different isTestnet
    mockSheetOption = {
      id: 'hyperliquid-testnet',
      providerId: 'hyperliquid',
      isTestnet: true,
      name: 'HyperLiquid',
      network: 'Testnet',
      description: '',
    };

    const { getByTestId } = render(<PerpsSelectProviderView />);

    await act(async () => {
      getByTestId('btn-select-option').props.onPress();
    });

    expect(mockToggleTestnet).toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalled();
  });
});
