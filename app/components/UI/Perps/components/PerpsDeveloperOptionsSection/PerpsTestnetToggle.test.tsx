import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsTestnetToggle } from './PerpsTestnetToggle';
import { PerpsTestnetToggleSelectorsIDs } from '../../Perps.testIds';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';

// Mock Toast Context to test toast functionality
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

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

const renderWithToastContext = (component: React.ReactElement) =>
  renderWithProvider(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      {component}
    </ToastContext.Provider>,
  );

describe('PerpsTestnetToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToggleTestnet.mockClear();
    mockShowToast.mockClear();
  });

  it('renders correctly with testnet network', () => {
    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { toJSON, getByTestId, getByText } = renderWithToastContext(
      <PerpsTestnetToggle />,
    );

    expect(toJSON()).toMatchSnapshot();

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(true);

    expect(getByText('Hyperliquid Network Toggle')).toBeVisible();
    expect(getByText('Testnet')).toBeVisible();
  });

  it('renders correctly with mainnet network', () => {
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { getByTestId, getByText } = renderWithToastContext(
      <PerpsTestnetToggle />,
    );

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

    const { getByTestId } = renderWithToastContext(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(true);

    await act(async () => {
      fireEvent(switchElement, 'onValueChange');
    });

    await waitFor(() => {
      expect(mockToggleTestnet).toHaveBeenCalledTimes(1);
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('toggles from mainnet to testnet successfully', async () => {
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockToggleTestnet.mockResolvedValue({
      success: true,
      isTestnet: true,
    });

    const { getByTestId } = renderWithToastContext(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(false);

    await act(async () => {
      fireEvent(switchElement, 'onValueChange');
    });

    await waitFor(() => {
      expect(mockToggleTestnet).toHaveBeenCalledTimes(1);
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('displays error toast when toggle fails', async () => {
    mockUsePerpsNetwork.mockReturnValue('testnet');
    mockToggleTestnet.mockResolvedValue({
      success: false,
    });

    const { getByTestId } = renderWithToastContext(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);

    await act(async () => {
      fireEvent(switchElement, 'onValueChange');
    });

    await waitFor(() => {
      expect(mockToggleTestnet).toHaveBeenCalledTimes(1);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        iconColor: IconColor.Error,
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            label: 'Failed to toggle network',
          }),
        ]),
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

    const { getByTestId, queryByTestId } = renderWithToastContext(
      <PerpsTestnetToggle />,
    );

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

    const { getByTestId } = renderWithToastContext(<PerpsTestnetToggle />);

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

    const { getByTestId } = renderWithToastContext(<PerpsTestnetToggle />);

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(true);

    await act(async () => {
      fireEvent(switchElement, 'onValueChange');
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled();
    });

    // Switch should maintain original state since toggle failed
    expect(switchElement.props.value).toBe(true);
  });

  it('synchronizes with external currentNetwork changes', async () => {
    // Start with testnet
    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { getByTestId, getByText, rerender } = renderWithToastContext(
      <PerpsTestnetToggle />,
    );

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);

    // Initially should show testnet
    expect(switchElement.props.value).toBe(true);
    expect(getByText('Testnet')).toBeVisible();

    // Simulate external network change to mainnet
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    rerender(
      <ToastContext.Provider value={{ toastRef: mockToastRef }}>
        <PerpsTestnetToggle />
      </ToastContext.Provider>,
    );

    // Should now show mainnet
    await waitFor(() => {
      expect(switchElement.props.value).toBe(false);
    });
    expect(getByText('Mainnet')).toBeVisible();
  });
});
