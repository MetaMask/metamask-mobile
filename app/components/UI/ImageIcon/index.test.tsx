import React from 'react';
import { render } from '@testing-library/react-native';
import ImageIcon from './';
const sampleImage = 'https://s3.amazonaws.com/airswap-token-images/WBTC.png';

describe('ImageIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<ImageIcon image={sampleImage} style={{}} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
