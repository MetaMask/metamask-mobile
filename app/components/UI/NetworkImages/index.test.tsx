import React from 'react';
import { render } from '@testing-library/react-native';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import { useSelector } from 'react-redux';
import NetworkImageComponent from '.';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock the useStyles hook to return dummy styles for our test
jest.mock('../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      overlappingAvatarsContainer: { flexDirection: 'row' },
      avatarWrapper: {},
      buttonIcon: {},
    },
  }),
}));

const BUTTON_TEST_ID = 'button-icon-test-id';

describe('NetworkImageComponent', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockReturnValue('default-network-image');
  });

  it('should render correctly', () => {
    const { toJSON } = render(
      <NetworkImageComponent
        isAllNetworksEnabled={false}
        allNetworksEnabled={{}}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders multiple avatars when isAllNetworksEnabled is true', () => {
    const allNetworksEnabled = { '1': true, '2': true };

    const { getAllByTestId } = render(
      <NetworkImageComponent
        isAllNetworksEnabled
        allNetworksEnabled={allNetworksEnabled}
      />,
    );

    // Since there are 2 network keys, expect 2 Avatar components rendered.
    const avatars = getAllByTestId(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
    );
    expect(avatars).toHaveLength(2);
  });

  it('renders a single avatar when isAllNetworksEnabled is false', () => {
    const { getAllByTestId } = render(
      <NetworkImageComponent
        isAllNetworksEnabled={false}
        allNetworksEnabled={{}}
      />,
    );

    // Expect 1 Avatar rendered via the useSelector value.
    const avatars = getAllByTestId(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
    );
    expect(avatars).toHaveLength(1);
  });

  it('renders the button when selectorButtonDisplayed is true', () => {
    const { getByTestId } = render(
      <NetworkImageComponent
        isAllNetworksEnabled={false}
        allNetworksEnabled={{}}
        selectorButtonDisplayed
      />,
    );

    // Button should be in the document.
    const button = getByTestId(BUTTON_TEST_ID);
    expect(button).toBeTruthy();
  });

  it('does not render the button when selectorButtonDisplayed is false', () => {
    const { queryByTestId } = render(
      <NetworkImageComponent
        isAllNetworksEnabled={false}
        allNetworksEnabled={{}}
        selectorButtonDisplayed={false}
      />,
    );

    // Button should not be rendered.
    const button = queryByTestId(BUTTON_TEST_ID);
    expect(button).toBeNull();
  });
});
