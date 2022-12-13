// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import { CustomSpendCapProps } from './CustomSpendCap.types';
import CustomSpendCap from './CustomSpendCap';
import {
  TICKER,
  ACCOUNT_BALANCE,
  DAPP_PROPOSED_VALUE,
  DAPP_DOMAIN,
  INPUT_VALUE_CHANGED,
} from './CustomSpendCap.constants';

describe('CustomSpendCap', () => {
  it('should render CustomSpendCap', () => {
    const wrapper = shallow<CustomSpendCapProps>(
      <CustomSpendCap
        ticker={TICKER}
        accountBalance={ACCOUNT_BALANCE}
        dappProposedValue={DAPP_PROPOSED_VALUE}
        domain={DAPP_DOMAIN}
        onInputChanged={INPUT_VALUE_CHANGED}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === 'custom-spend-cap',
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
