import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import RegionAlert from './RegionAlert';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Linking, TouchableOpacity } from 'react-native';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

describe('RegionAlert', () => {
  const mockDismiss = jest.fn();
  const defaultProps = {
    isVisible: true,
    title: 'Test Title',
    subtitle: 'Test Subtitle',
    body: 'Test Body',
    link: 'Learn more',
    dismiss: mockDismiss,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens support URL with UTM parameter when support link is pressed', () => {
    const { getByText } = renderWithProvider(<RegionAlert {...defaultProps} />);
    const learnMoreLink = getByText('Learn more');
    fireEvent.press(learnMoreLink);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://support.metamask.io/metamask-portfolio/buy/my-country-region-isnt-supported-for-buying-crypto/?utm_source=mobile_app',
    );
  });

  it('calls dismiss when close button is pressed', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <RegionAlert {...defaultProps} />,
    );
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Second touchable is the close button (first is disabled wrapper)
    const closeButton = touchables[1];
    fireEvent.press(closeButton);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
});
