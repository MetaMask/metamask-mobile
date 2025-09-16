import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardButton from './CardButton';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
jest.mock('../../../../hooks/useMetrics', () => {
  const actual = jest.requireActual('../../../../hooks/useMetrics');
  return {
    ...actual,
    useMetrics: () => ({
      trackEvent: jest.fn(),
      createEventBuilder: jest.fn(() => ({
        build: jest
          .fn()
          .mockReturnValue({ event: actual.MetaMetricsEvents.CARD_VIEWED }),
      })),
    }),
  };
});

interface PartialCardState {
  hasViewedCardButton?: boolean;
}

function renderWithProvider(
  component: React.ComponentType,
  stateOverride: PartialCardState = {},
) {
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
          ...stateOverride,
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

  it('renders with badge (not yet viewed) and matches snapshot', () => {
    const { toJSON, getByTestId } = renderWithProvider(() => (
      <CardButton
        onPress={mockOnPress}
        touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    ));

    expect(getByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE)).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('dispatches setHasViewedCardButton(true) and hides badge on first press', () => {
    const { getByTestId, store, queryByTestId } = renderWithProvider(() => (
      <CardButton
        onPress={mockOnPress}
        touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    ));

    const button = getByTestId(WalletViewSelectorsIDs.CARD_BUTTON);
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(store.getState().card.hasViewedCardButton).toBe(true);
    expect(queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE)).toBeNull();
  });

  it('does not dispatch setHasViewedCardButton again if already viewed', () => {
    const { getByTestId, store } = renderWithProvider(
      () => (
        <CardButton
          onPress={mockOnPress}
          touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ),
      { hasViewedCardButton: true },
    );

    const button = getByTestId(WalletViewSelectorsIDs.CARD_BUTTON);
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(store.getState().card.hasViewedCardButton).toBe(true);
  });

  it('renders without badge when already viewed', () => {
    const { toJSON, queryByTestId } = renderWithProvider(
      () => (
        <CardButton
          onPress={mockOnPress}
          touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ),
      { hasViewedCardButton: true },
    );

    expect(queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE)).toBeNull();
    expect(toJSON()).toMatchSnapshot();
  });
});
