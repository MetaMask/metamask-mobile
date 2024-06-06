// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import {
  DEFAULT_BUTTONICON_SIZE,
  DEFAULT_BUTTONICON_ICONCOLOR,
  DEFAULT_BUTTONICON_ICONNAME,
} from './ButtonIcon.constants';

describe('ButtonIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ButtonIcon
        iconColor={DEFAULT_BUTTONICON_ICONCOLOR}
        iconName={DEFAULT_BUTTONICON_ICONNAME}
        size={DEFAULT_BUTTONICON_SIZE}
        onPress={jest.fn}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
