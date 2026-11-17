import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CardHomeActionButtonRow, {
  getCardHomeActionVisibility,
  type CardHomeActionVisibilityInput,
} from './CardHomeActionButtonRow';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType } from '../../../types';
import {
  CardStatus,
  type CardDetails,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

const CARD: CardDetails = {
  id: 'card-1',
  status: CardStatus.ACTIVE,
  type: CardType.VIRTUAL,
  lastFour: '1234',
  isFreezable: true,
};

const CAPABILITIES = {
  supportsFundingLimits: true,
  supportsPinView: true,
} as CardProviderCapabilities;

const buildInput = (
  overrides: Partial<CardHomeActionVisibilityInput> = {},
): CardHomeActionVisibilityInput => ({
  card: CARD,
  capabilities: CAPABILITIES,
  isAuthenticated: true,
  isLoading: false,
  hasSetupActions: false,
  hasAlertOnlyState: false,
  isManageHidden: false,
  ...overrides,
});

describe('getCardHomeActionVisibility', () => {
  it('shows details and PIN for an active, funded card', () => {
    expect(getCardHomeActionVisibility(buildInput())).toEqual({
      details: true,
      pin: true,
    });
  });

  it.each([
    ['setup actions', { hasSetupActions: true }],
    ['an alert-only state', { hasAlertOnlyState: true }],
    ['a blocked card or forced UK migration', { isManageHidden: true }],
    ['loading', { isLoading: true }],
  ])('hides every button during %s', (_label, overrides) => {
    expect(getCardHomeActionVisibility(buildInput(overrides))).toEqual({
      details: false,
      pin: false,
    });
  });

  it('keeps the buttons for a funding-limit provider with no balance', () => {
    expect(getCardHomeActionVisibility(buildInput())).toEqual({
      details: true,
      pin: true,
    });
  });

  it('hides PIN when the provider has no PIN view', () => {
    expect(
      getCardHomeActionVisibility(
        buildInput({
          capabilities: {
            supportsFundingLimits: true,
            supportsPinView: false,
          } as CardProviderCapabilities,
        }),
      ).pin,
    ).toBe(false);
  });

  it('hides PIN when the card has no PIN', () => {
    expect(
      getCardHomeActionVisibility(
        buildInput({ card: { ...CARD, hasPin: false } }),
      ).pin,
    ).toBe(false);
  });

  it('shows the teaser buttons when signed out', () => {
    expect(
      getCardHomeActionVisibility(
        buildInput({ isAuthenticated: false, card: null }),
      ),
    ).toEqual({ details: true, pin: true });
  });
});

describe('CardHomeActionButtonRow', () => {
  it('renders nothing when no button is available', () => {
    const { queryByTestId } = render(<CardHomeActionButtonRow />);
    expect(queryByTestId(CardHomeSelectors.ACTION_BUTTON_ROW)).toBeNull();
  });

  it('renders the buttons it is given and calls their handlers', () => {
    const onAdd = jest.fn();
    const onDetails = jest.fn();
    const onPin = jest.fn();
    const { getByTestId } = render(
      <CardHomeActionButtonRow
        add={{ onPress: onAdd }}
        details={{ onPress: onDetails, isShowingDetails: false }}
        pin={{ onPress: onPin }}
      />,
    );

    fireEvent.press(getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON));
    fireEvent.press(getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON));
    fireEvent.press(getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onDetails).toHaveBeenCalledTimes(1);
    expect(onPin).toHaveBeenCalledTimes(1);
  });

  it('labels the details toggle by state', () => {
    const { getByText, rerender } = render(
      <CardHomeActionButtonRow
        details={{ onPress: jest.fn(), isShowingDetails: false }}
      />,
    );
    expect(getByText('Details')).toBeOnTheScreen();

    rerender(
      <CardHomeActionButtonRow
        details={{ onPress: jest.fn(), isShowingDetails: true }}
      />,
    );
    expect(getByText('Hide')).toBeOnTheScreen();
  });

  it('does not call a disabled button', () => {
    const onPin = jest.fn();
    const { getByTestId } = render(
      <CardHomeActionButtonRow pin={{ onPress: onPin, disabled: true }} />,
    );
    fireEvent.press(getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON));
    expect(onPin).not.toHaveBeenCalled();
  });
});
