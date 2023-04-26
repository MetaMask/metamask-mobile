// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../Icons/Icon';

// Internal dependencies
import TabBarItem from './TabBarItem';

describe('TabBarItem', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <TabBarItem
        label={'Tab'}
        icon={IconName.Bank}
        isSelected
        onPress={jest.fn}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
