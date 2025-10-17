import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsTutorialCard from './PerpsTutorialCard';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsTutorialSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Navigation mock functions
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock the useStyles hook
jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        gap: 70,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
      },
    },
  })),
}));

describe('PerpsTutorialCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the tutorial text', () => {
    const { getByText } = render(<PerpsTutorialCard />);
    expect(getByText('Learn the basics of perps')).toBeOnTheScreen();
  });

  it('has the correct testID', () => {
    const { getByTestId } = render(<PerpsTutorialCard />);
    expect(
      getByTestId(PerpsTutorialSelectorsIDs.TUTORIAL_CARD),
    ).toBeOnTheScreen();
  });

  it('navigates to perps tutorial when pressed', () => {
    // Arrange
    const { getByTestId } = render(<PerpsTutorialCard />);
    const tutorialCard = getByTestId(PerpsTutorialSelectorsIDs.TUTORIAL_CARD);

    // Act
    fireEvent.press(tutorialCard);

    // Assert
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL);
  });
});
