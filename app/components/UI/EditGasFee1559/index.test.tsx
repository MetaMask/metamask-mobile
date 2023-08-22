import { shallow } from 'enzyme';
import React from 'react';

import EditGasFee1559 from './';

describe('EditGasFee1559', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <EditGasFee1559
        gasFee={{
          maxWaitTimeEstimate: 150000,
          minWaitTimeEstimate: 0,
          suggestedMaxFeePerGas: '50',
          suggestedMaxPriorityFeePerGas: '2',
        }}
        view={''}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
