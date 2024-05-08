import React from 'react';
import { render } from '@testing-library/react-native';
import ImageIcon from './';

describe('ImageIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<ImageIcon image={'ETHEREUM'} style={{}} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
