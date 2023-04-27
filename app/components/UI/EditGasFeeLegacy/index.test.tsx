import React from 'react';
import { shallow } from 'enzyme';
import EditGasFeeLegacy from './';

describe('EditGasFeeLegacy', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <EditGasFeeLegacy
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
