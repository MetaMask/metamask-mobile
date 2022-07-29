import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';

import { STACKED_AVATARS_OVERFLOW_COUNTER } from '../../../constants/test-ids';

import StackedAvatars from '.';
import StackedAvatarData from './StackedAvatars.data';

describe('StackedAvatars', () => {
  const findOverflowCounter = (
    node: ShallowWrapper<any, any, React.Component>,
  ) => node.prop('testID') === STACKED_AVATARS_OVERFLOW_COUNTER;

  const { availableTokenList } = StackedAvatarData;

  it('should render correctly', () => {
    const wrapper = shallow(<StackedAvatars tokenList={availableTokenList} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render overflow counter', () => {
    const wrapper = shallow(<StackedAvatars tokenList={availableTokenList} />);

    const overflowCounter = wrapper.findWhere(findOverflowCounter);

    expect(overflowCounter.exists()).toBeTruthy();
  });
  it('should not render overflow counter', () => {
    const wrapper = shallow(
      <StackedAvatars tokenList={availableTokenList.slice(0, 4)} />,
    );

    const overflowCounter = wrapper.findWhere(findOverflowCounter);

    expect(overflowCounter.exists()).toBeFalsy();
  });
});
