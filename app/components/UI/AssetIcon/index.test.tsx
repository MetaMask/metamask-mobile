import React from 'react';
import { render } from '@testing-library/react-native';
import AssetIcon from './';
const sampleLogo = 'https://s3.amazonaws.com/airswap-token-images/WBTC.png';

describe('AssetIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<AssetIcon logo={sampleLogo} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
