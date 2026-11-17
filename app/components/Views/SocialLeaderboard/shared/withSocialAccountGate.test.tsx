import React from 'react';
import { Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { withSocialAccountGate } from './withSocialAccountGate';
import { SocialAccountDisabledViewSelectorsIDs } from './SocialAccountDisabledView';
import { useSocialModerationStatus } from '../../../UI/SocialFeed/hooks/useSocialModerationStatus';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../UI/SocialFeed/hooks/useSocialModerationStatus', () => ({
  useSocialModerationStatus: jest.fn(),
}));

jest.mock('../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({ openSupportWithConsent: jest.fn() }),
}));

let mockGlassHeadersEnabled = false;
jest.mock('../../../../selectors/featureFlagController/glassHeaders', () => ({
  selectGlassHeadersEnabled: () => mockGlassHeadersEnabled,
}));

const mockHeaderStandardGlassProps = jest.fn();
jest.mock(
  '../../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactActual = jest.requireActual('react');
    const ActualHeaderStandardGlass = jest.requireActual(
      '../../../../component-library/components-temp/HeaderStandardGlass',
    ).default;
    return {
      __esModule: true,
      default: (props: Record<string, unknown>) => {
        mockHeaderStandardGlassProps(props);
        return ReactActual.createElement(ActualHeaderStandardGlass, props);
      },
    };
  },
);

const mockUseStatus = useSocialModerationStatus as jest.Mock;

const Feed = ({ label }: { label: string }) => <Text>{label}</Text>;
const GatedFeed = withSocialAccountGate(Feed);

describe('withSocialAccountGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(false);
    mockGlassHeadersEnabled = false;
  });

  it('renders the screen with its props for a viewer in good standing', () => {
    mockUseStatus.mockReturnValue({ isBanned: false, reason: null });

    renderWithProvider(<GatedFeed label="the feed" />);

    expect(screen.getByText('the feed')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialAccountDisabledViewSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('shows only the disabled-account notice to a banned viewer', () => {
    mockUseStatus.mockReturnValue({ isBanned: true, reason: 'Scam' });

    renderWithProvider(<GatedFeed label="the feed" />);

    expect(screen.queryByText('the feed')).toBeNull();
    expect(
      screen.getByTestId(SocialAccountDisabledViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Your account is temporarily disabled'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Reason: Scam')).toBeOnTheScreen();
  });

  it('has no back button on a tab root', () => {
    mockUseStatus.mockReturnValue({ isBanned: true, reason: null });

    renderWithProvider(<GatedFeed label="the feed" />);

    expect(
      screen.queryByTestId(SocialAccountDisabledViewSelectorsIDs.BACK_BUTTON),
    ).toBeNull();
  });

  it('goes back from a pushed screen', () => {
    mockUseStatus.mockReturnValue({ isBanned: true, reason: null });
    mockCanGoBack.mockReturnValue(true);

    renderWithProvider(<GatedFeed label="the feed" />);
    fireEvent.press(
      screen.getByTestId(SocialAccountDisabledViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders the plain header when glass headers are disabled', () => {
    mockUseStatus.mockReturnValue({ isBanned: true, reason: null });

    renderWithProvider(<GatedFeed label="the feed" />);

    expect(mockHeaderStandardGlassProps).toHaveBeenCalledWith(
      expect.objectContaining({ isGlass: false, isFloating: false }),
    );
  });

  it('goes back from a glass header when glass headers are enabled', () => {
    mockUseStatus.mockReturnValue({ isBanned: true, reason: null });
    mockCanGoBack.mockReturnValue(true);
    mockGlassHeadersEnabled = true;

    renderWithProvider(<GatedFeed label="the feed" />);
    fireEvent.press(
      screen.getByTestId(SocialAccountDisabledViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockHeaderStandardGlassProps).toHaveBeenCalledWith(
      expect.objectContaining({ isGlass: true, isFloating: false }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });
});
