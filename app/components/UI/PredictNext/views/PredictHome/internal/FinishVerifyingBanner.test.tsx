import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { FinishVerifyingBanner } from './FinishVerifyingBanner';
import { PredictHomeTestIds } from '../PredictHome.testIds';

describe('FinishVerifyingBanner', () => {
  it('is one whole-card resume target with localized copy and action', () => {
    const onPress = jest.fn();
    render(<FinishVerifyingBanner onPress={onPress} />);

    const card = screen.getByTestId(PredictHomeTestIds.FINISH_VERIFYING_BANNER);
    expect(
      screen.getByText(
        strings('predict_next.account_readiness.finish_verifying.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('predict_next.account_readiness.finish_verifying.body'),
      ),
    ).toBeOnTheScreen();
    expect(card.props.accessibilityLabel).toContain(
      strings('predict_next.account_readiness.finish_verifying.action'),
    );
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: strings('predict_next.account_readiness.finish_verifying.action'),
      }),
    ).toBeNull();

    fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not activate while setup is already opening', () => {
    const onPress = jest.fn();
    render(<FinishVerifyingBanner isDisabled onPress={onPress} />);

    const card = screen.getByTestId(PredictHomeTestIds.FINISH_VERIFYING_BANNER);
    expect(card).toBeDisabled();

    fireEvent.press(card);

    expect(onPress).not.toHaveBeenCalled();
  });
});
