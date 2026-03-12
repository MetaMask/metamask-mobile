import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import RegionAlert from './RegionAlert';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Linking } from 'react-native';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
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

  it('renders correctly when visible', () => {
    const { toJSON } = renderWithProvider(<RegionAlert {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('does not render when not visible', () => {
    const { toJSON } = renderWithProvider(
      <RegionAlert {...defaultProps} isVisible={false} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays correct title, subtitle, and body', () => {
    const { getByText } = renderWithProvider(<RegionAlert {...defaultProps} />);
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Subtitle')).toBeTruthy();
    expect(getByText('Test Body')).toBeTruthy();
  });

  it('calls dismiss when close button is pressed', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <RegionAlert {...defaultProps} />,
    );
    const touchables = UNSAFE_getAllByType(
      require('react-native').TouchableOpacity,
    );
    // First touchable is the close button
    const closeButton = touchables[0];
    fireEvent.press(closeButton);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('opens support URL with UTM parameter when support link is pressed', () => {
    const { getByText } = renderWithProvider(<RegionAlert {...defaultProps} />);
    const learnMoreLink = getByText('Learn more');
    fireEvent.press(learnMoreLink);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://support.metamask.io/metamask-portfolio/buy/my-country-region-isnt-supported-for-buying-crypto/?utm_source=mobile_app',
    );
  });
});
