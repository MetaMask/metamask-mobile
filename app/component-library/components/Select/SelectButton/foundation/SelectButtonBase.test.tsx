// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import Icon, { IconName, IconColor, IconSize } from '../../../Icons/Icon';

// Internal dependencies.
import SelectButtonBase from './SelectButtonBase';
import {
  SAMPLE_SELECTBUTTONBASE_PROPS,
  SELECTBUTTONBASE_CARETICON_TESTID,
} from './SelectButtonBase.constants';

describe('SelectButtonBase', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <SelectButtonBase {...SAMPLE_SELECTBUTTONBASE_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render Header with the custom node if typeof children !== string', () => {
    const { queryByTestId } = render(
      <SelectButtonBase
        {...SAMPLE_SELECTBUTTONBASE_PROPS}
        caretIconEl={
          <Icon
            name={IconName.ArrowDown}
            color={IconColor.Default}
            size={IconSize.Md}
            testID={SELECTBUTTONBASE_CARETICON_TESTID}
          />
        }
      />,
    );
    expect(queryByTestId(SELECTBUTTONBASE_CARETICON_TESTID)).not.toBe(null);
  });
});
