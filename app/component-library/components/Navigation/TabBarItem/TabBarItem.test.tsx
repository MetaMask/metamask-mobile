// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '../../Icon';

// Internal dependencies
import TabBarItem from './TabBarItem';

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
