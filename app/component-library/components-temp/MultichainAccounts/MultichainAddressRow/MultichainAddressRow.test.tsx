import React from 'react';
import { render } from '@testing-library/react-native';
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
  it('should render correctly', () => {
    const wrapper = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the network name', () => {
    const { getByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    const networkName = getByTestId(
      MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID,
    );
    expect(networkName.props.children).toBe('Ethereum Mainnet');
  });

  it('should render the truncated address', () => {
    const { getByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    const address = getByTestId(MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID);
    expect(address.props.children).toBe('0x12345...67890');
  });

  it('should render the network icon', () => {
    const { getByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    const networkIcon = getByTestId(
      MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID,
    );
    expect(networkIcon).toBeTruthy();
  });

  it('should render copy and QR buttons', () => {
    const { getByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    const copyButton = getByTestId(MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID);
    const qrButton = getByTestId(MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID);

    expect(copyButton).toBeTruthy();
    expect(qrButton).toBeTruthy();
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

  it('should handle unknown chainId', () => {
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

  it('should render with default testID when not provided', () => {
    const { getByTestId } = render(
      <MultichainAddressRow {...SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS} />,
    );
    const component = getByTestId(MULTICHAIN_ADDRESS_ROW_TEST_ID);
    expect(component).toBeTruthy();
  });
});
