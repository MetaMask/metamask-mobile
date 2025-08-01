import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsTestnetToggle } from './PerpsTestnetToggle';
import { PerpsTestnetToggleSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
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

  it('should render correctly with testnet network', () => {
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

  it('should render correctly with mainnet network', () => {
    mockUsePerpsNetwork.mockReturnValue('mainnet');

    const { getByTestId, getByText } = renderWithToastContext(
      <PerpsTestnetToggle />,
    );

    const switchElement = getByTestId(PerpsTestnetToggleSelectorsIDs.SWITCH);
    expect(switchElement.props.value).toBe(false);

    expect(getByText('Hyperliquid Network Toggle')).toBeVisible();
    expect(getByText('Mainnet')).toBeVisible();
  });

  it('should toggle from testnet to mainnet successfully', async () => {
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

  it('should toggle from mainnet to testnet successfully', async () => {
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

  it('should display error toast when toggle fails', async () => {
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

  it('should show loading indicator while toggle is in progress', async () => {
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
    act(() => {
      resolveToggle({ success: true, isTestnet: false });
    });

    // Loading indicator should be hidden
    await waitFor(() => {
      expect(
        queryByTestId(PerpsTestnetToggleSelectorsIDs.LOADING_INDICATOR),
      ).toBeNull();
    });
  });

  it('should handle network state changes correctly after successful toggle', async () => {
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

  it('should maintain switch state when toggle fails', async () => {
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
});
