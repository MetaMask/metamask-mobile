import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import EarnMusdConversionEntryView from './index';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { EarnMusdConversionEntryViewSelectorsIDs } from './EarnMusdConversionEntryView.types';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
  };
});

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      background: { default: '#FFFFFF' },
      primary: { default: '#037DD6' },
    },
  }),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('EarnMusdConversionEntryView', () => {
  const mockNavigate = jest.fn();

  const mockNavigation = {
    navigate: mockNavigate,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // @ts-expect-error - partial mock of navigation is sufficient for testing
    mockUseNavigation.mockReturnValue(mockNavigation);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders loading indicator with correct testID', () => {
      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEntryView />,
        { state: {} },
      );

      expect(
        getByTestId(EarnMusdConversionEntryViewSelectorsIDs.LOADING_INDICATOR),
      ).toBeOnTheScreen();
    });

    it('renders container with correct testID', () => {
      const { getByTestId } = renderWithProvider(
        <EarnMusdConversionEntryView />,
        { state: {} },
      );

      expect(
        getByTestId(EarnMusdConversionEntryViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates to education screen on mount', async () => {
      renderWithProvider(<EarnMusdConversionEntryView />, { state: {} });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
          screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        });
      });
    });

    it('only navigates once due to ref guard', async () => {
      renderWithProvider(<EarnMusdConversionEntryView />, { state: {} });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });

      // Verify it was called exactly once (ref prevents double-execution)
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });
});
