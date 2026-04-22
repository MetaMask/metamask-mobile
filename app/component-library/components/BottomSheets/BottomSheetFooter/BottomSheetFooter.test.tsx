// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import BottomSheetFooter from './BottomSheetFooter';
import {
  SAMPLE_BOTTOMSHEETFOOTER_PROPS,
  TESTID_BOTTOMSHEETFOOTER,
  TESTID_BOTTOMSHEETFOOTER_BUTTON,
  TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT,
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

  it('should render the correct gap between buttons', () => {
    const { getByTestId } = render(
      <BottomSheetFooter {...SAMPLE_BOTTOMSHEETFOOTER_PROPS} />,
    );
    expect(
      getByTestId(TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT).props.style
        .marginLeft,
    ).toBe(16);
    expect(
      getByTestId(TESTID_BOTTOMSHEETFOOTER_BUTTON).props.style.marginLeft,
    ).not.toBe(16);
  });
});
