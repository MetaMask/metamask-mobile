// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import Icon, { IconName, IconColor, IconSize } from '../../../Icons/Icon';

// Internal dependencies.
import SelectableButton from './SelectableButton';
import {
  SAMPLE_SELECTABLEBUTTON_PROPS,
  SELECTABLEBUTTON_CARETICON_TESTID,
} from './SelectableButton.constants';

describe('SelectableButton', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <SelectableButton {...SAMPLE_SELECTABLEBUTTON_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render Header with the custom node if typeof children !== string', () => {
    const { queryByTestId } = render(
      <SelectableButton
        {...SAMPLE_SELECTABLEBUTTON_PROPS}
        caretIconEl={
          <Icon
            name={IconName.ArrowDown}
            color={IconColor.Default}
            size={IconSize.Md}
            testID={SELECTABLEBUTTON_CARETICON_TESTID}
          />
        }
      />,
    );
    expect(queryByTestId(SELECTABLEBUTTON_CARETICON_TESTID)).not.toBe(null);
  });
});
