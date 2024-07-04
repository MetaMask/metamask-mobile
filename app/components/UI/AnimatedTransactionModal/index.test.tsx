import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedTransactionModal from './';
import { View } from 'react-native';
import { ThemeContext } from '../../../util/theme'; // Correct import path for ThemeContext
import PropTypes from 'prop-types';

// Mock the colors context
const mockTheme = {
  colors: {
    primary: '#000000',
    background: '#ffffff',
    text: '#000000',
    border: '#000000',
    notification: '#000000',
  },
};

function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
  );
}

ThemeProviderWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

describe('AnimatedTransactionModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <AnimatedTransactionModal>
        <View />
      </AnimatedTransactionModal>,
      {
        wrapper: ThemeProviderWrapper,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
