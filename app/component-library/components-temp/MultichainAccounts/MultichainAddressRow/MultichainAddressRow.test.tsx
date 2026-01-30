import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MultichainAddressRow from './MultichainAddressRow';
import {
  SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS,
  MULTICHAIN_ADDRESS_ROW_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
} from './MultichainAddressRow.constants';
import { IconName } from '@metamask/design-system-react-native';

// Mock useCopyClipboard hook
jest.mock(
  '../../../../components/Views/Notifications/Details/hooks/useCopyClipboard',
  () => jest.fn(() => jest.fn()),
);

// Mock getNetworkImageSource utility
jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-image-url' })),
}));

describe('MultichainAddressRow', () => {
  it('renders MultichainAddressRow correctly', () => {
    const wrapper = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders the network name', () => {
    const { getByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    const networkName = getByTestId(
      MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID,
    );
    expect(networkName.props.children).toBe('Ethereum Mainnet');
  });

  it('renders the truncated address', () => {
    const { getByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    const address = getByTestId(MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID);
    expect(address.props.children).toBe('0x12345...67890');
  });

  it('renders the network icon', () => {
    const { getByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    const networkIcon = getByTestId(
      MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID,
    );
    expect(networkIcon).toBeTruthy();
  });

  it('renders copy and QR buttons', () => {
    const mockCallback = jest.fn();
    const copyParams = {
      callback: mockCallback,
      toastMessage: 'Address copied',
    };

    const { getByTestId } = render(
      <MultichainAddressRow
        {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS}
        copyParams={copyParams}
      />,
    );

    const copyButton = getByTestId(MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID);
    const qrButton = getByTestId(MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID);

    expect(copyButton).toBeTruthy();
    expect(qrButton).toBeTruthy();
  });

  it('does not render copy button if copyParams are missing', () => {
    const { queryByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );

    expect(
      queryByTestId(MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID),
    ).toBeNull();
  });

  it('should accept custom testID', () => {
    const customTestID = 'custom-test-id';
    const { getByTestId } = render(
      <MultichainAddressRow
        {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS}
        testID={customTestID}
      />,
    );
    const component = getByTestId(customTestID);
    expect(component).toBeTruthy();
  });

  it('handles unknown chainId', () => {
    const propsWithUnknownChainId = {
      ...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS,
      chainId: 'eip155:999999' as const,
      networkName: 'Unknown Network',
    };

    const { getByTestId } = render(
      <MultichainAddressRow {...propsWithUnknownChainId} />,
    );
    const networkIcon = getByTestId(
      MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID,
    );
    expect(networkIcon).toBeTruthy();
  });

  it('renders with default testID when not provided', () => {
    const { getByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    const component = getByTestId(MULTICHAIN_ADDRESS_ROW_TEST_ID);
    expect(component).toBeTruthy();
  });

  it('calls callback when copy button is pressed', async () => {
    const mockCallback = jest.fn();
    const copyParams = {
      callback: mockCallback,
      toastMessage: 'Address copied',
    };

    const { getByTestId } = render(
      <MultichainAddressRow
        {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS}
        copyParams={copyParams}
      />,
    );

    const copyButton = getByTestId(MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID);

    // Simulate pressing the copy button
    fireEvent.press(copyButton);

    // Callback should be called
    expect(mockCallback).toHaveBeenCalled();
  });

  it('renders custom icons with proper callbacks', () => {
    const mockIconCallback = jest.fn();
    const icons = [
      {
        name: IconName.Add,
        callback: mockIconCallback,
        testId: 'custom-icon-test-id',
      },
    ];

    const { getByTestId } = render(
      <MultichainAddressRow
        {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS}
        icons={icons}
      />,
    );

    const customIcon = getByTestId('custom-icon-test-id');

    // Simulate pressing the custom icon
    fireEvent.press(customIcon);

    // Verify mock callback function is called
    expect(mockIconCallback).toHaveBeenCalled();
  });

  it('shows toast when copy button is pressed and toastRef is provided', async () => {
    const mockCallback = jest.fn();
    const mockShowToast = jest.fn();
    const mockToastRef = {
      current: {
        showToast: mockShowToast,
        closeToast: jest.fn(),
      },
    };
    const copyParams = {
      callback: mockCallback,
      toastRef: mockToastRef,
      toastMessage: 'Address copied',
    };

    const { getByTestId } = render(
      <MultichainAddressRow
        {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS}
        copyParams={copyParams}
      />,
    );

    const copyButton = getByTestId(MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID);

    // Simulate pressing the copy button
    fireEvent.press(copyButton);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Toast should be called with Plain variant (no icon)
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: expect.stringContaining('Plain'),
      }),
    );
  });

  it('renders truncated address correctly when copyParams is missing', () => {
    const { getByTestId } = render(
      <MultichainAddressRow
        {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS}
        copyParams={undefined}
      />,
    );

    const address = getByTestId(MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID);
    expect(address.props.children).toBe('0x12345...67890');
  });

  it('does not throw errors for undefined icons', () => {
    const { getByTestId } = render(
      <MultichainAddressRow
        {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS}
        icons={undefined}
      />,
    );

    const actionsContainer = getByTestId(MULTICHAIN_ADDRESS_ROW_TEST_ID);
    expect(actionsContainer).toBeTruthy();
  });
});
