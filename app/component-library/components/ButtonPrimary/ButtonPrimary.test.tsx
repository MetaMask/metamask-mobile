import React from 'react';
import { shallow } from 'enzyme';
import { IconName } from '../Icon';
import { BaseButtonSize } from '../BaseButton';
import ButtonPrimary from './ButtonPrimary';
import { ButtonPrimaryVariant } from './ButtonPrimary.types';

describe('ButtonPrimary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonPrimary
        icon={IconName.BankFilled}
        size={BaseButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
        variant={ButtonPrimaryVariant.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
