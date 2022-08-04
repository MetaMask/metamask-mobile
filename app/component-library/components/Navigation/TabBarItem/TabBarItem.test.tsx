import React from 'react';
import { shallow } from 'enzyme';
import TabBarItem from './TabBarItem';
import { IconName } from '../Icon';

describe('TabBarItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <TabBarItem
        label={'Tab'}
        icon={IconName.BankFilled}
        isSelected
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
