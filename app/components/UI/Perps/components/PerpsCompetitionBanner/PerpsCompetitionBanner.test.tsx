import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsCompetitionBanner from './PerpsCompetitionBanner';
import { selectPerpsCompetitionBannerEnabledFlag } from '../../selectors/featureFlags';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PERPS_COMPETITION_BANNER_DISMISSED } from '../../../../../constants/storage';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const { useSelector } = jest.requireMock('react-redux');

const setupSelector = (enabled: boolean) => {
  useSelector.mockImplementation((selector: unknown) => {
    if (selector === selectPerpsCompetitionBannerEnabledFlag) {
      return enabled;
    }
    return undefined;
  });
};

describe('PerpsCompetitionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('renders nothing when flag is disabled', async () => {
    setupSelector(false);

    const { queryByTestId } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(queryByTestId('perps-competition-banner')).toBeNull();
    });
  });

  it('renders banner when flag is enabled and not dismissed', async () => {
    setupSelector(true);

    const { getByTestId } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(getByTestId('perps-competition-banner')).toBeOnTheScreen();
    });
  });

  it('renders nothing when banner was previously dismissed', async () => {
    setupSelector(true);
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue('true');

    const { queryByTestId } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(queryByTestId('perps-competition-banner')).toBeNull();
    });
  });

  it('displays competition title and description', async () => {
    setupSelector(true);

    const { getByText } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(getByText('Competition leaderboard')).toBeOnTheScreen();
      expect(
        getByText('See where you rank in the Perps trading competition'),
      ).toBeOnTheScreen();
    });
  });

  it('dismisses banner and persists state when close button is pressed', async () => {
    setupSelector(true);

    const { getByTestId, queryByTestId } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(getByTestId('perps-competition-banner')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('perps-competition-banner-close'));

    await waitFor(() => {
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        PERPS_COMPETITION_BANNER_DISMISSED,
        'true',
      );
      expect(queryByTestId('perps-competition-banner')).toBeNull();
    });
  });

  it('does not navigate when close button is pressed', async () => {
    setupSelector(true);

    const { getByTestId } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(getByTestId('perps-competition-banner')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('perps-competition-banner-close'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to rewards view when banner is tapped', async () => {
    setupSelector(true);

    const { getByTestId } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(getByTestId('perps-competition-banner')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('perps-competition-banner'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
  });

  it('uses custom testID when provided', async () => {
    setupSelector(true);

    const { getByTestId } = render(
      <PerpsCompetitionBanner testID="custom-banner" />,
    );

    await waitFor(() => {
      expect(getByTestId('custom-banner')).toBeOnTheScreen();
    });
  });
});
