import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsTestnetToggle } from './PerpsTestnetToggle';
import { PerpsTestnetToggleSelectorsIDs } from '../../Perps.testIds';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

// Mock Perps hooks
const mockToggleTestnet = jest.fn();
const mockUsePerpsNetworkConfig = jest.fn(() => ({
  toggleTestnet: mockToggleTestnet,
}));
const mockUsePerpsNetwork = jest.fn();

jest.mock('../../hooks', () => ({
  usePerpsNetworkConfig: () => mockUsePerpsNetworkConfig(),
  usePerpsNetwork: () => mockUsePerpsNetwork(),
}));

const renderToggle = (component: React.ReactElement) =>
  renderWithProvider(component);

describe('PerpsTestnetToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToggleTestnet.mockClear();
    (toast as unknown as jest.Mock).mockClear();
  });

  it('renders correctly with testnet network', () => {
    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { getByTestId, getByText } = renderToggle(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(true);

    expect(getByText('Hyperliquid Network Toggle')).toBeVisible();
    expect(getByText('Testnet')).toBeVisible();
  });

  it('renders correctly with mainnet network', () => {
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { getByTestId, getByText } = renderToggle(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(false);

    expect(getByText('Hyperliquid Network Toggle')).toBeVisible();
    expect(getByText('Mainnet')).toBeVisible();
  });

  it('toggles from testnet to mainnet successfully', async () => {
    mockUsePerpsNetwork.mockReturnValue('testnet');
    mockToggleTestnet.mockResolvedValue({
      success: true,
      isTestnet: false,
    });

    const { getByTestId } = renderToggle(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(true);

    await act(async () => {
      fireEvent(switchElement, 'onValueChange');
    });

    await waitFor(() => {
      expect(mockToggleTestnet).toHaveBeenCalledTimes(1);
    });

    expect(toast).not.toHaveBeenCalled();
  });

  it('toggles from mainnet to testnet successfully', async () => {
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockToggleTestnet.mockResolvedValue({
      success: true,
      isTestnet: true,
    });

    const { getByTestId } = renderToggle(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(false);

    await act(async () => {
      fireEvent(switchElement, 'onValueChange');
    });

    await waitFor(() => {
      expect(mockToggleTestnet).toHaveBeenCalledTimes(1);
    });

    expect(toast).not.toHaveBeenCalled();
  });

  it('displays error toast when toggle fails', async () => {
    mockUsePerpsNetwork.mockReturnValue('testnet');
    mockToggleTestnet.mockResolvedValue({
      success: false,
    });

    const { getByTestId } = renderToggle(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);

    await act(async () => {
      fireEvent(switchElement, 'onValueChange');
    });

    await waitFor(() => {
      expect(mockToggleTestnet).toHaveBeenCalledTimes(1);
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Failed to toggle network',
        severity: ToastSeverity.Danger,
        hasNoTimeout: false,
      }),
    );
  });

  it('shows loading indicator while toggle is in progress', async () => {
    mockUsePerpsNetwork.mockReturnValue('testnet');

    // Create a promise that we can control
    let resolveToggle: (value: unknown) => void;
    const togglePromise = new Promise((resolve) => {
      resolveToggle = resolve;
    });
    mockToggleTestnet.mockReturnValue(togglePromise);

    const { getByTestId, queryByTestId } = renderToggle(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);

    // Start the toggle
    act(() => {
      fireEvent(switchElement, 'onValueChange');
    });

    // Should show loading indicator
    await waitFor(() => {
      expect(
        getByTestId(PerpsTestnetToggleSelectorsIDs.LOADING_INDICATOR),
      ).toBeVisible();
    });

    // Resolve the toggle
    await act(async () => {
      resolveToggle({ success: true, isTestnet: false });
    });

    // Loading indicator should be hidden
    await waitFor(() => {
      expect(
        queryByTestId(PerpsTestnetToggleSelectorsIDs.LOADING_INDICATOR),
      ).toBeNull();
    });
  });

  it('handles network state changes correctly after successful toggle', async () => {
    mockUsePerpsNetwork.mockReturnValue('testnet');
    mockToggleTestnet.mockResolvedValue({
      success: true,
      isTestnet: false,
    });

    const { getByTestId } = renderToggle(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(true);

    await act(async () => {
      fireEvent(switchElement, 'onValueChange');
    });

    await waitFor(() => {
      expect(mockToggleTestnet).toHaveBeenCalledTimes(1);
    });
  });

  it('maintains switch state when toggle fails', async () => {
    mockUsePerpsNetwork.mockReturnValue('testnet');
    mockToggleTestnet.mockResolvedValue({
      success: false,
    });

    const { getByTestId } = renderToggle(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(true);

    await act(async () => {
      fireEvent(switchElement, 'onValueChange');
    });

    await waitFor(() => {
      expect(toast).toHaveBeenCalled();
    });

    // Switch should maintain original state since toggle failed
    expect(switchElement.props.value).toBe(true);
  });

  it('synchronizes with external currentNetwork changes', async () => {
    // Start with testnet
    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { getByTestId, getByText, rerender } = renderToggle(
      <PerpsTestnetToggle />,
    );

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);

    // Initially should show testnet
    expect(switchElement.props.value).toBe(true);
    expect(getByText('Testnet')).toBeVisible();

    // Simulate external network change to mainnet
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    rerender(<PerpsTestnetToggle />);

    // Should now show mainnet
    await waitFor(() => {
      expect(switchElement.props.value).toBe(false);
    });
    expect(getByText('Mainnet')).toBeVisible();
  });
});
