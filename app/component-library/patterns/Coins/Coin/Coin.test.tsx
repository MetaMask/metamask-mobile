// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import Coin from './Coin';
import { CoinSizes } from './Coin.types';
import { COIN_TEST_ID } from './Coin.constants';

describe('Coin - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Coin size={CoinSizes.Md}>
        <View />
      </Coin>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Coin', () => {
  it('should render Coin component', () => {
    const wrapper = shallow(
      <Coin size={CoinSizes.Md}>
        <View />
      </Coin>,
    );
    const CoinComponent = wrapper.findWhere(
      (node) => node.prop('testID') === COIN_TEST_ID,
    );
    expect(CoinComponent.exists()).toBe(true);
  });
});
