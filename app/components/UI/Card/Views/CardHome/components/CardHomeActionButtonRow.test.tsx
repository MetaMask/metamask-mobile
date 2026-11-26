import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CardHomeActionButtonRow, {
  getCardHomeActionVisibility,
  type CardHomeActionVisibilityInput,
} from './CardHomeActionButtonRow';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import { SNOWFLAKE_ICON_TEST_ID } from '../../../components/SnowflakeIcon';
import { CardType } from '../../../types';
import {
  CardStatus,
  type CardDetails,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('react-native-device-info', () => ({
  getTotalMemorySync: jest.fn(() => 8 * 1024 * 1024 * 1024),
}));

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
  supportsFreeze: true,
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
  it('shows details, PIN and freeze for an active, funded card', () => {
    expect(getCardHomeActionVisibility(buildInput())).toEqual({
      details: true,
      pin: true,
      freeze: true,
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
      freeze: false,
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

  it('hides freeze when the provider cannot freeze cards', () => {
    expect(
      getCardHomeActionVisibility(
        buildInput({
          capabilities: { ...CAPABILITIES, supportsFreeze: false },
        }),
      ).freeze,
    ).toBe(false);
  });

  it('hides freeze when the card is not freezable', () => {
    expect(
      getCardHomeActionVisibility(
        buildInput({ card: { ...CARD, isFreezable: false } }),
      ).freeze,
    ).toBe(false);
  });

  it('hides the cardholder buttons when signed out', () => {
    expect(
      getCardHomeActionVisibility(
        buildInput({ isAuthenticated: false, card: null }),
      ),
    ).toEqual({ details: false, pin: false, freeze: false });
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
    const onFreeze = jest.fn();
    const { getByTestId } = render(
      <CardHomeActionButtonRow
        add={{ onPress: onAdd }}
        details={{ onPress: onDetails, isShowingDetails: false }}
        pin={{ onPress: onPin }}
        freeze={{ onPress: onFreeze, isFrozen: false }}
      />,
    );

    fireEvent.press(getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON));
    fireEvent.press(getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON));
    fireEvent.press(getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON));
    fireEvent.press(getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onDetails).toHaveBeenCalledTimes(1);
    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onFreeze).toHaveBeenCalledTimes(1);
  });

  it('labels the toggles by state', () => {
    const { getByText, rerender } = render(
      <CardHomeActionButtonRow
        details={{ onPress: jest.fn(), isShowingDetails: false }}
        freeze={{ onPress: jest.fn(), isFrozen: false }}
      />,
    );
    expect(
      getByText(strings('card.card_home.action_buttons.details')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('card.card_home.action_buttons.freeze')),
    ).toBeOnTheScreen();

    rerender(
      <CardHomeActionButtonRow
        details={{ onPress: jest.fn(), isShowingDetails: true }}
        freeze={{ onPress: jest.fn(), isFrozen: true }}
      />,
    );
    expect(
      getByText(strings('card.card_home.action_buttons.hide_details')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('card.card_home.action_buttons.unfreeze')),
    ).toBeOnTheScreen();
  });

  it('does not call a disabled button', () => {
    const onPin = jest.fn();
    const { getByTestId } = render(
      <CardHomeActionButtonRow pin={{ onPress: onPin, disabled: true }} />,
    );
    fireEvent.press(getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON));
    expect(onPin).not.toHaveBeenCalled();
  });

  it('uses the temporary snowflake icon for both Freeze and Unfreeze', () => {
    const { getByTestId, rerender } = render(
      <CardHomeActionButtonRow
        freeze={{ onPress: jest.fn(), isFrozen: false }}
      />,
    );
    expect(getByTestId(SNOWFLAKE_ICON_TEST_ID)).toBeOnTheScreen();

    rerender(
      <CardHomeActionButtonRow
        freeze={{ onPress: jest.fn(), isFrozen: true }}
      />,
    );
    expect(getByTestId(SNOWFLAKE_ICON_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON)).toBeOnTheScreen();
  });
});
