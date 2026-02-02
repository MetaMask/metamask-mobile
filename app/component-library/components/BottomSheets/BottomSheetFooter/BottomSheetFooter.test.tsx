// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import BottomSheetFooter from './BottomSheetFooter';
import {
  SAMPLE_BOTTOMSHEETFOOTER_PROPS,
  TESTID_BOTTOMSHEETFOOTER,
} from './BottomSheetFooter.constants';
import { ButtonsAlignment } from './BottomSheetFooter.types';

describe('BottomSheetFooter', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <BottomSheetFooter {...SAMPLE_BOTTOMSHEETFOOTER_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the correct default buttonsAlignment', () => {
    const { getByTestId } = render(
      <BottomSheetFooter {...SAMPLE_BOTTOMSHEETFOOTER_PROPS} />,
    );
    expect(
      getByTestId(TESTID_BOTTOMSHEETFOOTER).props.style.flexDirection,
    ).toBe('row');
  });

  it('should render the correct given buttonsAlignment', () => {
    const givenButtonsAlignment = ButtonsAlignment.Vertical;
    const { getByTestId } = render(
      <BottomSheetFooter
        {...SAMPLE_BOTTOMSHEETFOOTER_PROPS}
        buttonsAlignment={givenButtonsAlignment}
      />,
    );
    expect(
      getByTestId(TESTID_BOTTOMSHEETFOOTER).props.style.flexDirection,
    ).toBe('column');
  });

  it('should render the correct spacing between buttons', () => {
    const { getByTestId } = render(
      <BottomSheetFooter {...SAMPLE_BOTTOMSHEETFOOTER_PROPS} />,
    );
    // Spacing is applied via gap on the container
    expect(getByTestId(TESTID_BOTTOMSHEETFOOTER).props.style.gap).toBe(16);
  });
});
