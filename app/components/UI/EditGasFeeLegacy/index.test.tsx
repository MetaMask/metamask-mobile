import React from 'react';
import { render } from '@testing-library/react-native';
import EditGasFeeLegacy from './';
import { ThemeContext, mockTheme } from '../../../util/theme';

describe('EditGasFeeLegacy', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <EditGasFeeLegacy
          gasFee={{
            maxWaitTimeEstimate: 150000,
            minWaitTimeEstimate: 0,
            suggestedGasLimit: '21000',
            suggestedGasPrice: '10',
          }}
          view={''}
        />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
