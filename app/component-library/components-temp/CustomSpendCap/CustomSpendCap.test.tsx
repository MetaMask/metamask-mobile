import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import CustomSpendCap from './CustomSpendCap';
import {
  ACCOUNT_BALANCE,
  CUSTOM_SPEND_CAP_TEST_ID,
  DAPP_PROPOSED_VALUE,
  INPUT_VALUE_CHANGED,
  TICKER,
} from './CustomSpendCap.constants';

function RenderCustomSpendCap(
  tokenSpendValue = '',
  isInputValid: () => boolean = () => true,
  dappProposedValue: string = DAPP_PROPOSED_VALUE,
  accountBalance: string = ACCOUNT_BALANCE,
  unroundedAccountBalance: string = ACCOUNT_BALANCE,
) {
  return (
    <CustomSpendCap
      ticker={TICKER}
      accountBalance={accountBalance}
      unroundedAccountBalance={unroundedAccountBalance}
      dappProposedValue={dappProposedValue}
      onInputChanged={INPUT_VALUE_CHANGED}
      isEditDisabled={false}
      editValue={() => ({})}
      tokenSpendValue={tokenSpendValue}
      isInputValid={isInputValid}
      tokenDecimal={18}
      toggleLearnMoreWebPage={() => undefined}
    />
  );
}

const isInputValid = jest.fn();

describe('CustomSpendCap', () => {
  it('should render CustomSpendCap', () => {
    renderWithProvider(RenderCustomSpendCap(''));
    expect(screen.getByTestId(CUSTOM_SPEND_CAP_TEST_ID)).toBeTruthy();
  });

  it('displays error message when value is not a number', async () => {
    const { findByText } = renderWithProvider(RenderCustomSpendCap('abc'));

    expect(await findByText('Error: Enter only numbers')).toBeOnTheScreen();
  });

  it('displays caution message when value is 0', async () => {
    const { findByText } = renderWithProvider(RenderCustomSpendCap('0'));

    expect(
      await findByText(
        `Only enter a number that you're comfortable with the third party spending now or in the future. You can always increase the spending cap later. Learn more`,
      ),
    ).toBeOnTheScreen();
  });

  it('displays spend value in ticker format when value is within account balance', async () => {
    const { toJSON } = renderWithProvider(RenderCustomSpendCap('100'));

    expect(JSON.stringify(toJSON())).toMatch(`100 ${TICKER}`);
  });

  it('displays over-balance warning when value exceeds account balance', async () => {
    const { findByText } = renderWithProvider(RenderCustomSpendCap('300'));

    expect(
      await findByText(
        'This allows the third party to spend all your token balance until it reaches the cap or you revoke the spending cap. If this is not intended, consider setting a lower spending cap. Learn more',
      ),
    ).toBeOnTheScreen();
  });

  it('calls isInputValid with false when value is not a number', () => {
    renderWithProvider(RenderCustomSpendCap('abc', isInputValid));

    expect(isInputValid).toHaveBeenCalledWith(false);
  });

  it('calls isInputValid with true when value is a number', () => {
    renderWithProvider(RenderCustomSpendCap('100', isInputValid));

    expect(isInputValid).toHaveBeenCalledWith(true);
  });

  it('displays token spend value when tokenSpendValue is provided', async () => {
    const { findByText } = renderWithProvider(
      RenderCustomSpendCap('100', isInputValid, DAPP_PROPOSED_VALUE),
    );

    expect(await findByText(`100 ${TICKER}`)).toBeOnTheScreen();
  });

  it('populates input with rounded balance when max is pressed and unrounded balance is empty', async () => {
    const { findByTestId, findByText } = renderWithProvider(
      RenderCustomSpendCap(
        '100',
        isInputValid,
        DAPP_PROPOSED_VALUE,
        '3.14',
        '',
      ),
    );

    fireEvent.press(await findByText('Max'));

    const input = await findByTestId('custom-spend-cap-input-input-id');
    expect(input.props.value).toEqual('3.14');
  });

  it('populates input with unrounded balance when max is pressed and unrounded balance is set', async () => {
    const { findByTestId, findByText } = renderWithProvider(
      RenderCustomSpendCap(
        '100',
        isInputValid,
        DAPP_PROPOSED_VALUE,
        '3.14',
        '3.141592654',
      ),
    );

    fireEvent.press(await findByText('Max'));

    const input = await findByTestId('custom-spend-cap-input-input-id');
    expect(input.props.value).toEqual('3.141592654');
  });
});
