import { shallow } from 'enzyme';
// Third party dependencies.
import React from 'react';

import renderWithProvider from '../../../util/test/renderWithProvider';
import CustomSpendCap from './CustomSpendCap';
import {
  ACCOUNT_BALANCE,
  DAPP_DOMAIN,
  DAPP_PROPOSED_VALUE,
  INPUT_VALUE_CHANGED,
  TICKER,
} from './CustomSpendCap.constants';
// Internal dependencies.
import { CustomSpendCapProps } from './CustomSpendCap.types';

describe('CustomSpendCap', () => {
  it('should render CustomSpendCap', () => {
    const wrapper = shallow<CustomSpendCapProps>(
      <CustomSpendCap
        ticker={TICKER}
        accountBalance={ACCOUNT_BALANCE}
        dappProposedValue={DAPP_PROPOSED_VALUE}
        domain={DAPP_DOMAIN}
        onInputChanged={INPUT_VALUE_CHANGED}
        isEditDisabled={false}
        editValue={() => ({})}
        tokenSpendValue={''}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === 'custom-spend-cap',
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });

  it('should match snapshot', () => {
    const container = renderWithProvider(
      <CustomSpendCap
        ticker={TICKER}
        accountBalance={ACCOUNT_BALANCE}
        dappProposedValue={DAPP_PROPOSED_VALUE}
        domain={DAPP_DOMAIN}
        onInputChanged={INPUT_VALUE_CHANGED}
        isEditDisabled={false}
        editValue={() => ({})}
        tokenSpendValue={''}
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('should render valid message if value is 0', async () => {
    const { findByText } = renderWithProvider(
      <CustomSpendCap
        ticker={TICKER}
        accountBalance={ACCOUNT_BALANCE}
        dappProposedValue={DAPP_PROPOSED_VALUE}
        domain={DAPP_DOMAIN}
        onInputChanged={INPUT_VALUE_CHANGED}
        isEditDisabled={false}
        editValue={() => ({})}
        tokenSpendValue="0"
      />,
    );

    expect(
      await findByText(
        `Only enter a number that you're comfortable with ${DAPP_DOMAIN} accessing now or in the future. You can always increase the token limit later.`,
      ),
    ).toBeDefined();
  });
});
