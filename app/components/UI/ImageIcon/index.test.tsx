import React from 'react';
import { shallow } from 'enzyme';
import ImageIcon from './';
const sampleImage = 'https://s3.amazonaws.com/airswap-token-images/WBTC.png';

describe('ImageIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<ImageIcon image={sampleImage} style={{}} />);
    expect(wrapper).toMatchSnapshot();
  });
});
