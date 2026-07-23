import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsCompetitionBanner from './PerpsCompetitionBanner';
import { selectPerpsCompetitionBannerEnabledFlag } from '../../selectors/featureFlags';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PERPS_COMPETITION_BANNER_DISMISSED } from '../../../../../constants/storage';
import Routes from '../../../../../constants/navigation/Routes';
import { setPendingDeeplink } from '../../../../../reducers/rewards';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

const COMPETITION_BANNER_BUTTON = {
  ENGAGE: 'competition_banner_engage',
  CLOSE: 'competition_banner_close',
} as const;

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockTrack = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: mockTrack,
  })),
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

    expect(mockDispatch).toHaveBeenCalledWith(
      setPendingDeeplink({ campaign: 'perps-comp' }),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
  });

  it('stays hidden for this session when storage write fails on dismiss', async () => {
    setupSelector(true);
    (StorageWrapper.setItem as jest.Mock).mockRejectedValue(
      new Error('storage write failed'),
    );

    const { getByTestId, queryByTestId } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(getByTestId('perps-competition-banner')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('perps-competition-banner-close'));

    await waitFor(() => {
      expect(queryByTestId('perps-competition-banner')).toBeNull();
    });
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

  it('tracks PERPS_UI_INTERACTION with engage payload when banner is tapped', async () => {
    setupSelector(true);

    const { getByTestId } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(getByTestId('perps-competition-banner')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('perps-competition-banner'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
        [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.BANNER,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: COMPETITION_BANNER_BUTTON.ENGAGE,
        [PERPS_EVENT_PROPERTY.LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
      },
    );
  });

  it('tracks PERPS_UI_INTERACTION with close payload when close button is pressed', async () => {
    setupSelector(true);

    const { getByTestId } = render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(getByTestId('perps-competition-banner')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('perps-competition-banner-close'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: COMPETITION_BANNER_BUTTON.CLOSE,
        [PERPS_EVENT_PROPERTY.LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
      },
    );
  });

  it('does not track any event when banner is not rendered', async () => {
    setupSelector(false);

    render(<PerpsCompetitionBanner />);

    await waitFor(() => {
      expect(mockTrack).not.toHaveBeenCalled();
    });
  });
});
