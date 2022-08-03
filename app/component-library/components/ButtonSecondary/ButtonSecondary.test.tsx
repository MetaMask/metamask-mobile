import React from 'react';
import { shallow } from 'enzyme';
import { IconName } from '../Icon';
import { ButtonSize } from '../Button';
import ButtonSecondary from './ButtonSecondary';
import { ButtonSecondaryVariant } from './ButtonSecondary.types';

describe('ButtonSecondary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonSecondary
        icon={IconName.BankFilled}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
        variant={ButtonSecondaryVariant.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
