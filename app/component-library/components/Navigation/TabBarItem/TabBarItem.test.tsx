// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '../../Icons/Icon';

// Internal dependencies
import TabBarItem from './TabBarItem';

describe('TabBarItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <TabBarItem
        label={'Tab'}
        icon={IconName.Bank}
        isSelected
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
