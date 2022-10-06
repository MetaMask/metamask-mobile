import React from 'react';
import { shallow } from 'enzyme';

import { ButtonSize } from '../../Button.types';
import { IconName } from '../../../../Icon';

import ButtonTertiary from './ButtonTertiary';
import { ButtonTertiaryVariants } from './ButtonTertiary.types';

describe('ButtonTertiary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonTertiary
        iconName={IconName.BankFilled}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
        buttonTertiaryVariants={ButtonTertiaryVariants.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
