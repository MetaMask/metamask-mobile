import React from 'react';
import { shallow } from 'enzyme';
import { IconName } from '../Icon';
import { ButtonSize } from '../Button';
import ButtonPrimary from './ButtonPrimary';
import { ButtonPrimaryVariant } from './ButtonPrimary.types';

describe('ButtonPrimary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonPrimary
        icon={IconName.BankFilled}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
        variant={ButtonPrimaryVariant.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
