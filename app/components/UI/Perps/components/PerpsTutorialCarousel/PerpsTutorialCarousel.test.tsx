import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsTutorialCarousel from './PerpsTutorialCarousel';
import { strings } from '../../../../../../locales/i18n';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

// Mock usePerpsFirstTimeUser hook
const mockMarkTutorialCompleted = jest.fn();
jest.mock('../../hooks', () => ({
  usePerpsFirstTimeUser: () => ({
    markTutorialCompleted: mockMarkTutorialCompleted,
  }),
}));

jest.mock('react-native-scrollable-tab-view', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: MockReact.forwardRef(
      (
        {
          children,
          onChangeTab,
          initialPage,
        }: {
          children: React.ReactNode;
          onChangeTab?: (obj: { i: number }) => void;
          initialPage?: number;
        },
        ref: React.Ref<{ goToPage: (page: number) => void }>,
      ) => {
        const [currentPage, setCurrentPage] = MockReact.useState(
          initialPage || 0,
        );

        MockReact.useImperativeHandle(ref, () => ({
          goToPage: (page: number) => {
            setCurrentPage(page);
            if (onChangeTab) {
              onChangeTab({ i: page });
            }
          },
        }));

        // Only render the current page's child
        const childrenArray = MockReact.Children.toArray(children);
        return <View>{childrenArray[currentPage]}</View>;
      },
    ),
  };
});

describe('PerpsTutorialCarousel', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 0, bottom: 0 });
  });

  describe('Component Rendering', () => {
    it('should render tutorial content for the first screen', () => {
      render(<PerpsTutorialCarousel />);

      expect(
        screen.getByText(strings('perps.tutorial.what_are_perps.title')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.tutorial.what_are_perps.description')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.tutorial.what_are_perps.subtitle')),
      ).toBeOnTheScreen();

      // Button should say "Continue" for first screen
      expect(
        screen.getByText(strings('perps.tutorial.continue')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.tutorial.skip')),
      ).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('should navigate to deposit screen when on last screen and pressing continue', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times (6 screens total)
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        await act(async () => {
          fireEvent.press(continueButton);
        });
      }

      // Verify we're on the last screen
      expect(
        screen.getByText(strings('perps.tutorial.ready_to_trade.title')),
      ).toBeOnTheScreen();

      // Button should say "Add funds" on last screen
      expect(
        screen.getByText(strings('perps.tutorial.add_funds')),
      ).toBeOnTheScreen();

      // Press the "Add funds" button
      await act(async () => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.add_funds')));
      });

      // Should mark tutorial as completed and navigate to deposit screen
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PERPS.DEPOSIT,
      );
    });

    it('should go back when pressing Skip on first screen', () => {
      render(<PerpsTutorialCarousel />);

      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.skip')));
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(mockMarkTutorialCompleted).not.toHaveBeenCalled();
    });

    it('should mark tutorial as completed and go back when pressing Skip on last screen', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate to the last screen
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        await act(async () => {
          fireEvent.press(continueButton);
        });
      }

      // Verify we're on the last screen
      expect(
        screen.getByText(strings('perps.tutorial.ready_to_trade.title')),
      ).toBeOnTheScreen();

      // Skip button should say "Got it" on last screen
      expect(
        screen.getByText(strings('perps.tutorial.got_it')),
      ).toBeOnTheScreen();

      // Press the "Got it" button
      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.got_it')));
      });

      // Should mark tutorial as completed and go back
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should mark tutorial as completed when finishing tutorial', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times to get to last screen
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        await act(async () => {
          fireEvent.press(continueButton);
        });
      }

      // Press Add funds button on last screen
      await act(async () => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.add_funds')));
      });

      // Should mark tutorial as completed
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
    });

    it('should navigate to deposit when on last screen', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        await act(async () => {
          fireEvent.press(continueButton);
        });
      }

      // Press Add funds button on last screen
      await act(async () => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.add_funds')));
      });

      // Should navigate to deposit
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PerpsDeposit');
    });
  });
});
