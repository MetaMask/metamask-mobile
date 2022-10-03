import React from 'react';
import { shallow } from 'enzyme';

import { ButtonBaseSize } from '../ButtonBase';
import { IconName } from '../../Icon';

import ButtonTertiary from './ButtonTertiary';
import { ButtonTertiaryVariant } from './ButtonTertiary.types';

describe('ButtonTertiary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonTertiary
        iconName={IconName.BankFilled}
        size={ButtonBaseSize.Md}
        label={'Click me!'}
        onPress={() => null}
        variant={ButtonTertiaryVariant.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
