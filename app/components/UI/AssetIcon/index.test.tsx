import React from 'react';
import { shallow } from 'enzyme';
import AssetIcon from './';
const sampleLogo = 'https://s3.amazonaws.com/airswap-token-images/WBTC.png';

describe('AssetIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<AssetIcon logo={sampleLogo} />);
    expect(wrapper).toMatchSnapshot();
  });
});
