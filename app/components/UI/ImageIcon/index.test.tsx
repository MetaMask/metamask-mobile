import React from 'react';
import { render } from '@testing-library/react-native';
import ImageIcon from './';

describe('ImageIcon', () => {
  it('should render correctly', () => {
    const component = render(<ImageIcon image={'ETHEREUM'} style={{}} />);
    expect(component).toMatchSnapshot();
  });
});
