import { shallow } from 'enzyme';
// Third party dependencies.
import React from 'react';

import renderWithProvider from '../../../util/test/renderWithProvider';
import CustomSpendCap from './CustomSpendCap';
import {
    ACCOUNT_BALANCE, CUSTOM_SPEND_CAP_TEST_ID, DAPP_DOMAIN, INPUT_VALUE_CHANGED, TICKER
} from './CustomSpendCap.constants';
// Internal dependencies.
import { CustomSpendCapProps } from './CustomSpendCap.types';

function RenderCustomSpendCap(
  tokenSpendValue: string,
  isInputValid: () => boolean = () => true,
) {
  return (
    <CustomSpendCap
      ticker={TICKER}
      accountBalance={ACCOUNT_BALANCE}
      dappProposedValue={tokenSpendValue}
      domain={DAPP_DOMAIN}
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
        `Only enter a number that you're comfortable with ${DAPP_DOMAIN} accessing now or in the future. You can always increase the token limit later. Learn more`,
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
    const valueDifference =
      Number(valueGreaterThanBalance) - Number(ACCOUNT_BALANCE);
    const { toJSON } = renderWithProvider(
      RenderCustomSpendCap(valueGreaterThanBalance),
    );

    expect(JSON.stringify(toJSON())).toMatch(`${valueDifference} ${TICKER}`);
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
});
