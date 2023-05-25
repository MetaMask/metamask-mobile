import { shallow } from 'enzyme';
// Third party dependencies.
import React from 'react';

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
});
