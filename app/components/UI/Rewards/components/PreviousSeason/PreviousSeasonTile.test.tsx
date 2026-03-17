import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PreviousSeasonTile from './PreviousSeasonTile';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign.pill_complete': 'Complete',
    };
    return translations[key] || key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('PreviousSeasonTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when seasonName is not available', () => {
    mockUseSelector.mockReturnValue(null);

    const { toJSON } = render(<PreviousSeasonTile />);

    expect(toJSON()).toBeNull();
  });

  it('renders season name when seasonName is available', () => {
    mockUseSelector.mockReturnValue('Season 1');

    const { getByTestId } = render(<PreviousSeasonTile />);

    expect(getByTestId('previous-season-tile-name')).toHaveTextContent(
      'Season 1',
    );
  });

  it('renders the complete label', () => {
    mockUseSelector.mockReturnValue('Season 1');

    const { getByText } = render(<PreviousSeasonTile />);

    expect(getByText('Complete')).toBeOnTheScreen();
  });

  it('renders background image', () => {
    mockUseSelector.mockReturnValue('Season 1');

    const { getByTestId } = render(<PreviousSeasonTile />);

    expect(getByTestId('previous-season-tile-background')).toBeDefined();
  });

  it('renders foreground image', () => {
    mockUseSelector.mockReturnValue('Season 1');

    const { getByTestId } = render(<PreviousSeasonTile />);

    expect(getByTestId('previous-season-tile-image')).toBeDefined();
  });

  it('navigates to PreviousSeasonView on press', () => {
    mockUseSelector.mockReturnValue('Season 1');

    const { getByTestId } = render(<PreviousSeasonTile />);

    fireEvent.press(getByTestId('previous-season-tile'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW, {
      screen: Routes.PREVIOUS_SEASON_VIEW,
    });
  });
});
