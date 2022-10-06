// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '../../../../Icon';

// Internal dependencies.
import ButtonBase from './ButtonBase';
import { ButtonSize } from '../../Button.types';

describe('ButtonBase', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonBase
        iconName={IconName.BankFilled}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
