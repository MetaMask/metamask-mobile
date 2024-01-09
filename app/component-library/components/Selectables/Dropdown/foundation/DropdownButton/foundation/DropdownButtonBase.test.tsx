// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import Icon, { IconName, IconColor, IconSize } from '../../../../../Icons/Icon';

// Internal dependencies.
import DropdownButtonBase from './DropdownButtonBase';
import {
  SAMPLE_DROPDOWNBUTTONBASE_PROPS,
  DROPDOWNBUTTONBASE_CARETICON_TESTID,
} from './DropdownButtonBase.constants';

describe('DropdownButtonBase', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <DropdownButtonBase {...SAMPLE_DROPDOWNBUTTONBASE_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render Header with the custom node if typeof children !== string', () => {
    const { queryByTestId } = render(
      <DropdownButtonBase
        {...SAMPLE_DROPDOWNBUTTONBASE_PROPS}
        caretIconEl={
          <Icon
            name={IconName.ArrowDown}
            color={IconColor.Default}
            size={IconSize.Md}
            testID={DROPDOWNBUTTONBASE_CARETICON_TESTID}
          />
        }
      />,
    );
    expect(queryByTestId(DROPDOWNBUTTONBASE_CARETICON_TESTID)).not.toBe(null);
  });
});
