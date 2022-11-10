// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import CoinPattern from './Coin';
import { CoinPatternSizes } from './Coin.types';
import { COIN_PATTERN_TEST_ID } from './Coin.constants';

describe('CoinPattern - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <CoinPattern size={CoinPatternSizes.Md}>
        <View />
      </CoinPattern>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CoinPattern', () => {
  it('should render CoinPattern component', () => {
    const wrapper = shallow(
      <CoinPattern size={CoinPatternSizes.Md}>
        <View />
      </CoinPattern>,
    );
    const CoinPatternComponent = wrapper.findWhere(
      (node) => node.prop('testID') === COIN_PATTERN_TEST_ID,
    );
    expect(CoinPatternComponent.exists()).toBe(true);
  });
});
