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
        isSwapEnabled
        onAddFunds={jest.fn()}
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
        isSwapEnabled
        onAddFunds={jest.fn()}
        onEnableCard={onEnableCard}
      />,
    );

    fireEvent.press(getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON));
    expect(onEnableCard).toHaveBeenCalledTimes(1);
  });
});
