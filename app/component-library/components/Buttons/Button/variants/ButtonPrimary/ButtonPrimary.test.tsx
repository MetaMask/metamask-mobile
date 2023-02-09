// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { ButtonSize } from '../../Button.types';
import { IconName } from '../../../../Icon';

// Internal dependencies.
import ButtonPrimary from './ButtonPrimary';

describe('ButtonPrimary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonPrimary
        iconName={IconName.BankFilled}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
