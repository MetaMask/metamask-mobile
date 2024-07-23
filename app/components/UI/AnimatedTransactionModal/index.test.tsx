import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedTransactionModal from './';
import { View } from 'react-native';
import { ThemeContext } from '../../../util/theme';

// Mock theme context
const mockTheme = {
  colors: {
    primary: '#000',
    background: '#fff',
    card: '#ccc',
    text: '#333',
    border: '#ddd',
  },
};

describe('AnimatedTransactionModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <AnimatedTransactionModal>
          <View />
        </AnimatedTransactionModal>
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
