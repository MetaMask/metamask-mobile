import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CardActionsButtons from './CardActionsButtons';
import { CardHomeSelectors } from '../CardHome.testIds';

describe('CardActionsButtons', () => {
  it('disables Enable card while an approval is running', () => {
    const onEnableCard = jest.fn();
    const { getByTestId } = render(
      <CardActionsButtons
        actions={[{ type: 'enable_card' }]}
        isLoading={false}
        onEnableCard={onEnableCard}
        isEnableCardDisabled
      />,
    );

    const button = getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON);
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onEnableCard).not.toHaveBeenCalled();
  });

  it('leaves Enable card pressable when no approval is running', () => {
    const onEnableCard = jest.fn();
    const { getByTestId } = render(
      <CardActionsButtons
        actions={[{ type: 'enable_card' }]}
        isLoading={false}
        onEnableCard={onEnableCard}
      />,
    );

    fireEvent.press(getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON));
    expect(onEnableCard).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when there is no enable action, because Add funds lives in the action row', () => {
    const { queryByTestId } = render(
      <CardActionsButtons
        actions={[{ type: 'add_funds', enabled: true }]}
        isLoading={false}
        onEnableCard={jest.fn()}
      />,
    );

    expect(queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON)).toBeNull();
    expect(queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON)).toBeNull();
  });

  it('renders the action-button skeleton while loading', () => {
    const { getByTestId } = render(
      <CardActionsButtons
        actions={[{ type: 'enable_card' }]}
        isLoading
        onEnableCard={jest.fn()}
      />,
    );

    expect(
      getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON),
    ).toBeOnTheScreen();
  });
});
