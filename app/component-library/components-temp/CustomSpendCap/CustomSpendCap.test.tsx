import { shallow } from 'enzyme';
// Third party dependencies.
import React from 'react';

import renderWithProvider from '../../../util/test/renderWithProvider';
import CustomSpendCap from './CustomSpendCap';
import {
  ACCOUNT_BALANCE,
  CUSTOM_SPEND_CAP_TEST_ID,
  DAPP_DOMAIN,
  DAPP_PROPOSED_VALUE,
  INPUT_VALUE_CHANGED,
  TICKER,
} from './CustomSpendCap.constants';
// Internal dependencies.
import { CustomSpendCapProps } from './CustomSpendCap.types';

function RenderCustomSpendCap(tokenSpendValue: string) {
  return (
    <CustomSpendCap
      ticker={TICKER}
      accountBalance={ACCOUNT_BALANCE}
      dappProposedValue={DAPP_PROPOSED_VALUE}
      domain={DAPP_DOMAIN}
      onInputChanged={INPUT_VALUE_CHANGED}
      isEditDisabled={false}
      editValue={() => ({})}
      tokenSpendValue={tokenSpendValue}
    />
  );
}

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
        `Only enter a number that you're comfortable with ${DAPP_DOMAIN} accessing now or in the future. You can always increase the token limit later.`,
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
});
