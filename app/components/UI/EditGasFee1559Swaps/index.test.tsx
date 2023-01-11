import React from 'react';
import { shallow } from 'enzyme';
import EditGasFee1559Swaps from '.';

describe('EditGasFee1559Swaps', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <EditGasFee1559Swaps
        gasFee={{
          maxWaitTimeEstimate: 150000,
          minWaitTimeEstimate: 0,
          suggestedMaxFeePerGas: '50',
          suggestedMaxPriorityFeePerGas: '2',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
