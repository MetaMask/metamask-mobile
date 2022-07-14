import React from 'react';
import { shallow } from 'enzyme';
import { IconName } from '../Icon';
import { BaseButtonSize } from '../BaseButton';
import ButtonSecondary from './ButtonSecondary';
import { ButtonSecondaryVariant } from './ButtonSecondary.types';

describe('ButtonSecondary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonSecondary
        icon={IconName.BankFilled}
        size={BaseButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
        variant={ButtonSecondaryVariant.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
