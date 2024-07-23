// Third party dependencies.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import SheetHeader from './SheetHeader';
import {
  SHEET_HEADER_ACTION_BUTTON_ID,
  SHEET_HEADER_BACK_BUTTON_ID,
} from './SheetHeader.constants';

describe('SheetHeader', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<SheetHeader title={'Title'} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render back button and respond to press', () => {
    const onBackMock = jest.fn();
    render(<SheetHeader onBack={onBackMock} title={'Title'} />);
    const backButton = screen.getByTestId(SHEET_HEADER_BACK_BUTTON_ID);
    expect(backButton).toBeTruthy();

    fireEvent.press(backButton);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it('should render action button and respond to press', () => {
    const onPressMock = jest.fn();
    render(
      <SheetHeader
        title={'Title'}
        actionButtonOptions={{ label: 'Action', onPress: onPressMock }}
      />,
    );
    const actionButton = screen.getByTestId(SHEET_HEADER_ACTION_BUTTON_ID);
    expect(actionButton).toBeTruthy();

    fireEvent.press(actionButton);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
