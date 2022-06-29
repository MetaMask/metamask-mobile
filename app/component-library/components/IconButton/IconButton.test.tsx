import React from 'react';
import { shallow } from 'enzyme';
import { IconName } from '../Icon';
import IconButton from './IconButton';
import { IconButtonVariant } from './IconButton.types';

describe('IconButton', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <IconButton
        variant={IconButtonVariant.Primary}
        icon={IconName.AddSquareFilled}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
