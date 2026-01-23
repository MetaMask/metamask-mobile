import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardHomeError from './CardHomeError';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { CardHomeSelectors } from '../CardHome.testIds';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'card.card_home.error_title': 'Something went wrong',
      'card.card_home.error_description':
        'We encountered an error loading your card. Please try again.',
      'card.card_home.try_again': 'Try Again',
    };
    return mockStrings[key] || key;
  }),
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'CardHomeError',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('CardHomeError', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auth error state', () => {
    it('does not render error text or retry button when isAuthError is true', () => {
      const { queryByText, queryByTestId } = renderWithProvider(() => (
        <CardHomeError isAuthError canRetry onRetry={mockOnRetry} />
      ));

      // Auth error shows loading spinner, not error message
      expect(queryByText('Something went wrong')).toBeNull();
      expect(queryByTestId(CardHomeSelectors.TRY_AGAIN_BUTTON)).toBeNull();
    });
  });

  describe('non-auth error state', () => {
    it('renders error title and description', () => {
      const { getByText } = renderWithProvider(() => (
        <CardHomeError
          isAuthError={false}
          canRetry={false}
          onRetry={mockOnRetry}
        />
      ));

      expect(getByText('Something went wrong')).toBeOnTheScreen();
      expect(
        getByText(
          'We encountered an error loading your card. Please try again.',
        ),
      ).toBeOnTheScreen();
    });

    it('renders Try Again button when canRetry is true', () => {
      const { getByTestId, getByText } = renderWithProvider(() => (
        <CardHomeError isAuthError={false} canRetry onRetry={mockOnRetry} />
      ));

      expect(getByTestId(CardHomeSelectors.TRY_AGAIN_BUTTON)).toBeOnTheScreen();
      expect(getByText('Try Again')).toBeOnTheScreen();
    });

    it('hides Try Again button when canRetry is false', () => {
      const { queryByTestId } = renderWithProvider(() => (
        <CardHomeError
          isAuthError={false}
          canRetry={false}
          onRetry={mockOnRetry}
        />
      ));

      expect(
        queryByTestId(CardHomeSelectors.TRY_AGAIN_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('calls onRetry when Try Again button is pressed', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardHomeError isAuthError={false} canRetry onRetry={mockOnRetry} />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.TRY_AGAIN_BUTTON));

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('renders error content container', () => {
      const { getByText } = renderWithProvider(() => (
        <CardHomeError
          isAuthError={false}
          canRetry={false}
          onRetry={mockOnRetry}
        />
      ));

      // Error content should be visible with title and description
      expect(getByText('Something went wrong')).toBeOnTheScreen();
      expect(
        getByText(
          'We encountered an error loading your card. Please try again.',
        ),
      ).toBeOnTheScreen();
    });
  });
});
