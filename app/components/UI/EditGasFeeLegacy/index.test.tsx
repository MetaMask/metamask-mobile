import { render } from '@testing-library/react-native';
import React from 'react';

import EditGasFeeLegacy from './';
import { ThemeContext, mockTheme } from '../../../util/theme';

jest.mock('../../../util/theme', () => {
  const mockColors = {
    primary: '#000000',
    secondary: '#FFFFFF',
    success: '#28A745',
    error: '#DC3545',
    warning: '#FFA500',
    info: '#17A2B8',
    background: '#F2F2F2',
    border: '#CCCCCC',
    text: '#333333',
    // Add any other color properties used in your application
  };

  const mockThemeInner = {
    colors: mockColors,
  };

  return {
    ThemeContext: {
      _currentValue: mockThemeInner,
      Provider: ({ children }: { children: React.ReactNode }) => children,
      Consumer: ({
        children,
      }: {
        children: (context: { colors: typeof mockColors }) => React.ReactNode;
      }) => children({ colors: mockColors }),
    },
    mockTheme: mockThemeInner,
  };
});

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
