import React from 'react';
import { shallow } from 'enzyme';
import { IconName } from '../Icon';
import { ButtonSize } from '../Button';
import ButtonTertiary from './ButtonTertiary';
import { ButtonTertiaryVariant } from './ButtonTertiary.types';

describe('ButtonTertiary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonTertiary
        icon={IconName.BankFilled}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
        variant={ButtonTertiaryVariant.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
