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

      // Should navigate to deposit screen
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PERPS.DEPOSIT,
      );
    });

    it('should go back when pressing Skip', () => {
      render(<PerpsTutorialCarousel />);

      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.skip')));
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should call onComplete when provided and on last screen', async () => {
      const mockOnComplete = jest.fn();
      render(<PerpsTutorialCarousel onComplete={mockOnComplete} />);

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

      // Should call onComplete
      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled(); // Should not navigate when onComplete is provided
    });

    it('should call onClose when provided and pressing Skip', () => {
      const mockOnClose = jest.fn();
      render(<PerpsTutorialCarousel onClose={mockOnClose} />);

      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.skip')));
      });

      // Should call onClose
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockNavigation.goBack).not.toHaveBeenCalled(); // Should not go back when onClose is provided
    });
  });
});
