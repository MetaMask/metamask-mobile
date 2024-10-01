// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '@component-library/components/Icons/Icon';

// Internal dependencies.
import ButtonBase from './ButtonBase';
import { ButtonSize } from '@component-library/components/Buttons/Button/Button.types';

describe('ButtonBase', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonBase
        startIconName={IconName.Bank}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly when disabled', () => {
    const wrapper = shallow(
      <ButtonBase
        isDisabled
        startIconName={IconName.Bank}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
