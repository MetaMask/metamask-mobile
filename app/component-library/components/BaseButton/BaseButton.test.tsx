import React from 'react';
import { shallow } from 'enzyme';
import { IconName } from '../Icon';
import BaseButton, { BaseButtonSize } from './';

describe('BaseButton', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <BaseButton
        icon={IconName.BankFilled}
        size={BaseButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
