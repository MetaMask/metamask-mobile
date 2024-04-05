import { shallow } from 'enzyme';
// Third party dependencies.
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
// Internal dependencies.
import { CustomSpendCapProps } from './CustomSpendCap.types';

function RenderCustomSpendCap(
  tokenSpendValue = '',
  isInputValid: () => boolean = () => true,
  dappProposedValue: string = DAPP_PROPOSED_VALUE,
) {
  return (
    <CustomSpendCap
      ticker={TICKER}
      accountBalance={ACCOUNT_BALANCE}
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
    const wrapper = shallow<CustomSpendCapProps>(RenderCustomSpendCap(''));
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CUSTOM_SPEND_CAP_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });

  it('should match snapshot', () => {
    const container = renderWithProvider(RenderCustomSpendCap(''));
    expect(container).toMatchSnapshot();
  });

  it('should render error message is value is not a number', async () => {
    const notANumber = 'abc';
    const { findByText } = renderWithProvider(RenderCustomSpendCap(notANumber));

    expect(await findByText('Error: Enter only numbers')).toBeDefined();
  });

  it('should render valid message if value is 0', async () => {
    const zeroValue = '0';
    const { findByText } = renderWithProvider(RenderCustomSpendCap(zeroValue));

    expect(
      await findByText(
        `Only enter a number that you're comfortable with the third party spending now or in the future. You can always increase the spending cap later. Learn more`,
      ),
    ).toBeDefined();
  });

  it('should render valid message if value is less than or equal to account balance', async () => {
    const valueLessThanBalance = '100';
    const { toJSON } = renderWithProvider(
      RenderCustomSpendCap(valueLessThanBalance),
    );

    expect(JSON.stringify(toJSON())).toMatch(
      `${valueLessThanBalance} ${TICKER}`,
    );
  });

  it('should render valid message if value is greater than account balance', async () => {
    const valueGreaterThanBalance = '300';
    const { findByText } = renderWithProvider(
      RenderCustomSpendCap(valueGreaterThanBalance),
    );

    expect(
      await findByText(
        'This allows the third party to spend all your token balance until it reaches the cap or you revoke the spending cap. If this is not intended, consider setting a lower spending cap. Learn more',
      ),
    ).toBeDefined();
  });

  it('should call isInputValid with false if value is not a number', async () => {
    const notANumber = 'abc';
    renderWithProvider(RenderCustomSpendCap(notANumber, isInputValid));

    expect(isInputValid).toHaveBeenCalledWith(false);
  });

  it('should call isInputValid with true if value is a number', async () => {
    const validNumber = '100';
    renderWithProvider(RenderCustomSpendCap(validNumber, isInputValid));

    expect(isInputValid).toHaveBeenCalledWith(true);
  });

  it('should render token spend value if present', async () => {
    const inputtedSpendValue = '100';

    const { findByText } = renderWithProvider(
      RenderCustomSpendCap(
        inputtedSpendValue,
        isInputValid,
        DAPP_PROPOSED_VALUE,
      ),
    );

    expect(await findByText(`${inputtedSpendValue} ${TICKER}`)).toBeDefined();
  });
});
