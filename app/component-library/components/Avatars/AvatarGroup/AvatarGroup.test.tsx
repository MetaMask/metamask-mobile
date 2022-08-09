// Third party dependencies.
import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';

// Internal dependencies.
import AvatarGroup from './AvatarGroup';
import {
  AVAILABLE_TOKEN_LIST,
  STACKED_AVATARS_OVERFLOW_COUNTER_ID,
} from './AvatarGroup.constants';

describe('AvatarGroup', () => {
  const findOverflowCounter = (
    node: ShallowWrapper<any, any, React.Component>,
  ) => node.prop('testID') === STACKED_AVATARS_OVERFLOW_COUNTER_ID;

  it('should render correctly', () => {
    const wrapper = shallow(<AvatarGroup tokenList={AVAILABLE_TOKEN_LIST} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render overflow counter', () => {
    const wrapper = shallow(<AvatarGroup tokenList={AVAILABLE_TOKEN_LIST} />);

    const overflowCounter = wrapper.findWhere(findOverflowCounter);

    expect(overflowCounter.exists()).toBeTruthy();
  });
  it('should not render overflow counter', () => {
    const wrapper = shallow(
      <AvatarGroup tokenList={AVAILABLE_TOKEN_LIST.slice(0, 4)} />,
    );

    const overflowCounter = wrapper.findWhere(findOverflowCounter);

    expect(overflowCounter.exists()).toBeFalsy();
  });
});
