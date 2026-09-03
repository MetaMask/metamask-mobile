import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { getTokenImageSource } from '../../../utils';
import { createMockTokenWithBalance } from '../../../testUtils';
import NetworkFeeRow from './index';
import { NetworkFeeRowSelectorsIDs } from './testIds';

jest.mock('../../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'https://network.icon' })),
}));

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTokenImageSource: jest.fn(() => ({ uri: 'https://token.icon' })),
}));

const mockFeeToken = createMockTokenWithBalance({
  symbol: 'ETH',
  name: 'Ether',
});

const defaultProps = {
  amount: '$1.69',
  token: mockFeeToken,
  onPress: jest.fn(),
};

describe('NetworkFeeRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(getNetworkImageSource)
      .mockReturnValue({ uri: 'https://network.icon' });
    jest
      .mocked(getTokenImageSource)
      .mockReturnValue({ uri: 'https://token.icon' });
  });

  it('renders the estimated network fee amount', () => {
    const { getByTestId } = render(<NetworkFeeRow {...defaultProps} />);

    expect(getByTestId(NetworkFeeRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(NetworkFeeRowSelectorsIDs.VALUE)).toHaveTextContent(
      '$1.69',
    );
  });

  it('renders the estimated network fee label', () => {
    const { getByText } = render(<NetworkFeeRow {...defaultProps} />);

    expect(
      getByText(strings('bridge.limit.est_network_fee')),
    ).toBeOnTheScreen();
  });

  it('renders the fee token avatar when a token is provided', () => {
    const { getByTestId } = render(<NetworkFeeRow {...defaultProps} />);

    expect(getByTestId(NetworkFeeRowSelectorsIDs.AVATAR)).toBeOnTheScreen();
  });

  it('hides the fee token avatar when no token is provided', () => {
    const { queryByTestId } = render(
      <NetworkFeeRow {...defaultProps} token={undefined} />,
    );

    expect(queryByTestId(NetworkFeeRowSelectorsIDs.AVATAR)).toBeNull();
  });

  it('calls onPress when the fee value is pressed', () => {
    const { getByTestId } = render(<NetworkFeeRow {...defaultProps} />);

    fireEvent.press(getByTestId(NetworkFeeRowSelectorsIDs.CONTAINER));

    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a non-interactive amount when onPress is omitted', () => {
    const { getByTestId } = render(
      <NetworkFeeRow amount="$1.69" token={mockFeeToken} />,
    );

    expect(getByTestId(NetworkFeeRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(NetworkFeeRowSelectorsIDs.VALUE)).toHaveTextContent(
      '$1.69',
    );
    expect(getByTestId(NetworkFeeRowSelectorsIDs.AVATAR)).toBeOnTheScreen();
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <NetworkFeeRow {...defaultProps} testID="custom-network-fee-row" />,
    );

    expect(getByTestId('custom-network-fee-row')).toBeOnTheScreen();
    expect(queryByTestId(NetworkFeeRowSelectorsIDs.CONTAINER)).toBeNull();
  });
});
