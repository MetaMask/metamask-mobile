import React from 'react';
import { render } from '@testing-library/react-native';
import EditGasFeeLegacy from './';

describe('EditGasFeeLegacy', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <EditGasFeeLegacy
        gasFee={{
          maxWaitTimeEstimate: 150000,
          minWaitTimeEstimate: 0,
          suggestedGasLimit: '21000',
          suggestedGasPrice: '10',
        }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
