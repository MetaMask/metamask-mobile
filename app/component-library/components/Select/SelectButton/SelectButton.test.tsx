// Third party dependencies.
import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import SelectButton from './SelectButton';
import {
  SAMPLE_SELECTBUTTON_PROPS,
  SELECTBUTTON_TESTID,
} from './SelectButton.constants';

describe('SelectButton', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(<SelectButton {...SAMPLE_SELECTBUTTON_PROPS} />);
    expect(wrapper.toJSON()).toBeDefined();
  });

  it('should render SelectButton with the correct size', () => {
    const { queryByTestId } = render(
      <SelectButton {...SAMPLE_SELECTBUTTON_PROPS} />,
    );
    const node = queryByTestId(SELECTBUTTON_TESTID);
    const flat = StyleSheet.flatten(node?.props.style);
    expect(flat?.minHeight).toBe(40);
  });
});
