import React from 'react';
import { shallow } from 'enzyme';

import { ButtonSize } from '../../Button.types';
import { IconName } from '../../../../Icons/Icon';

import ButtonTertiary from './ButtonTertiary';
import { ButtonTertiaryVariants } from './ButtonTertiary.types';

describe('ButtonTertiary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonTertiary
        IconName={IconName.Bank}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
        buttonTertiaryVariants={ButtonTertiaryVariants.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
