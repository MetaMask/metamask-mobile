import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedTransactionModal from './';
import { View } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { mockTheme } from '../../../util/theme';

describe('AnimatedTransactionModal', () => {
  it('should render correctly', () => {
    console.log('mockTheme:', mockTheme);
    const { toJSON } = render(
      <ThemeProvider theme={mockTheme}>
        <AnimatedTransactionModal>
          <View />
        </AnimatedTransactionModal>
      </ThemeProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
