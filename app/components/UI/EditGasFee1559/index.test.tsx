import React from 'react';
import { render } from '@testing-library/react-native';
import EditGasFee1559 from './';
import { ThemeContext, mockTheme } from '../../../util/theme';

describe('EditGasFee1559', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <EditGasFee1559
          gasFee={{
            maxWaitTimeEstimate: 150000,
            minWaitTimeEstimate: 0,
            suggestedMaxFeePerGas: '50',
            suggestedMaxPriorityFeePerGas: '2',
          }}
          view={''}
        />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
