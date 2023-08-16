// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '../../Icons/Icon';
import { mockTheme } from '../../../../util/theme';
import { AvatarSize } from '../../Avatars/Avatar';

// Internal dependencies
import TabBarItem from './TabBarItem';

describe('TabBarItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <TabBarItem
        label={'Tab'}
        icon={IconName.Bank}
        onPress={jest.fn}
        iconSize={AvatarSize.Md}
        iconColor={mockTheme.colors.primary.default}
        iconBackgroundColor={mockTheme.colors.background.default}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
