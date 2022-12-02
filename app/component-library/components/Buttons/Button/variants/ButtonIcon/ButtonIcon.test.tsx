// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconNames } from '../../../../Icons/Icon';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import { ButtonIconVariants } from './ButtonIcon.types';

describe('ButtonIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonIcon
        buttonIconVariants={ButtonIconVariants.Primary}
        IconNames={IconNames.AddSquare}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
