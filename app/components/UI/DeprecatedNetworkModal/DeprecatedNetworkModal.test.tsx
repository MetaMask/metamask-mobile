import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DeprecatedNetworkModal from './DeprecatedNetworkModal';
import { CONNECTING_TO_DEPRECATED_NETWORK } from '../../../constants/urls';

jest.mock('../../../util/analytics/externalLinkTracking', () => ({
  ...jest.requireActual('../../../util/analytics/externalLinkTracking'),
  trackExternalLinkClicked: jest.fn(),
}));
import { trackExternalLinkClicked } from '../../../util/analytics/externalLinkTracking';
describe('DeprecatedNetworkModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks External Link Clicked when Learn more is pressed', () => {
    const { getByText } = renderWithProvider(<DeprecatedNetworkModal />);

    fireEvent.press(getByText('Learn more'));

    expect(jest.mocked(trackExternalLinkClicked)).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        location: 'dapp_connection_request',
        text: 'Learn More',
        url_domain: CONNECTING_TO_DEPRECATED_NETWORK,
      },
    );
  });

  it('opens CONNECTING_TO_DEPRECATED_NETWORK URL when Learn more is pressed', () => {
    const { getByText } = renderWithProvider(<DeprecatedNetworkModal />);

    fireEvent.press(getByText('Learn more'));

    expect(Linking.openURL).toHaveBeenCalledWith(
      CONNECTING_TO_DEPRECATED_NETWORK,
    );
  });
});
