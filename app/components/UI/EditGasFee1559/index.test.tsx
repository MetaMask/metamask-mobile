import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';

import EditGasFee1559 from './';

describe('EditGasFee1559', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <EditGasFee1559
        gasFee={{
          maxWaitTimeEstimate: 150000,
          minWaitTimeEstimate: 0,
          suggestedMaxFeePerGas: '50',
          suggestedMaxPriorityFeePerGas: '2',
        }}
        gasOptions={{}}
        ignoreOptions={[]}
        onChange={jest.fn()}
        view={''}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
