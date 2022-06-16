import React from 'react';
import { shallow } from 'enzyme';
import BaseButton from './';
import { IconName } from '../Icon';
import { BaseButtonSize } from './BaseButton.types';

describe('BaseButton', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <BaseButton
        iconName={IconName.BankFilled}
        size={BaseButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
