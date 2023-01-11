import React from 'react';
import { shallow } from 'enzyme';
import EditGasFeeLegacySwaps from '.';

describe('EditGasFeeLegacySwaps', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <EditGasFeeLegacySwaps
        gasFee={{
          maxWaitTimeEstimate: 150000,
          minWaitTimeEstimate: 0,
          suggestedGasLimit: '21000',
          suggestedGasPrice: '10',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
