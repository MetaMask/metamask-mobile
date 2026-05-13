import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PerpsServiceInterruptionBanner from './PerpsServiceInterruptionBanner';
import { selectPerpsServiceInterruptionBannerEnabledFlag } from '../../selectors/featureFlags';

const mockNavigate = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

const { useSelector } = jest.requireMock('react-redux');

describe('PerpsServiceInterruptionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when flag is disabled', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return false;
      }
      return undefined;
    });

    const { queryByTestId } = render(<PerpsServiceInterruptionBanner />);

    expect(queryByTestId('perps-service-interruption-banner')).toBeNull();
  });

  it('renders banner when flag is enabled', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByTestId } = render(<PerpsServiceInterruptionBanner />);

    expect(getByTestId('perps-service-interruption-banner')).toBeOnTheScreen();
  });

  it('displays outage title text', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByText } = render(<PerpsServiceInterruptionBanner />);

    expect(getByText('Perps is experiencing an outage')).toBeOnTheScreen();
  });

  it('displays description and links', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByText } = render(<PerpsServiceInterruptionBanner />);

    expect(
      getByText(/The team is aware and working on a fix/),
    ).toBeOnTheScreen();
    expect(getByText('contact customer support here')).toBeOnTheScreen();
    expect(getByText('Manage any position on Hyperliquid')).toBeOnTheScreen();
  });

  it('navigates to support when support link pressed', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByTestId } = render(<PerpsServiceInterruptionBanner />);

    fireEvent.press(
      getByTestId('perps-service-interruption-banner-support-link'),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('opens Hyperliquid URL when link pressed', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByTestId } = render(<PerpsServiceInterruptionBanner />);

    fireEvent.press(
      getByTestId('perps-service-interruption-banner-hyperliquid-link'),
    );

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://app.hyperliquid.xyz/',
    );
  });

  it('uses custom testID when provided', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByTestId } = render(
      <PerpsServiceInterruptionBanner testID="custom-banner" />,
    );

    expect(getByTestId('custom-banner')).toBeOnTheScreen();
  });
});
