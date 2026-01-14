import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardButton from './CardButton';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';

jest.mock('../../../../hooks/useMetrics', () => {
  const actual = jest.requireActual('../../../../hooks/useMetrics');
  return {
    ...actual,
    useMetrics: () => ({
      trackEvent: jest.fn(),
      createEventBuilder: jest.fn(() => ({
        build: jest.fn().mockReturnValue({
          event: actual.MetaMetricsEvents.CARD_BUTTON_VIEWED,
        }),
      })),
    }),
  };
});

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    { name: 'CardButton' },
    {
      state: {
        engine: { backgroundState },
        card: {
          cardholderAccounts: [],
          priorityTokensByAddress: {},
          lastFetchedByAddress: {},
          hasViewedCardButton: false,
          isLoaded: false,
        },
      },
    },
  );
}

describe('CardButton Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and matches snapshot', () => {
    const { toJSON, getByTestId } = renderWithProvider(() => (
      <CardButton
        onPress={mockOnPress}
        touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    ));

    expect(getByTestId(WalletViewSelectorsIDs.CARD_BUTTON)).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onPress when button is pressed', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardButton
        onPress={mockOnPress}
        touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    ));

    const button = getByTestId(WalletViewSelectorsIDs.CARD_BUTTON);
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
