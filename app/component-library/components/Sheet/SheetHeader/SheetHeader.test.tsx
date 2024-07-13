// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

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

  it('should render back button', () => {
    render(<SheetHeader onBack={jest.fn} title={'Title'} />);
    const backButton = screen.getByTestId(SHEET_HEADER_BACK_BUTTON_ID);
    expect(backButton).toBeTruthy();
  });

  it('should render action button', () => {
    render(
      <SheetHeader
        title={'Title'}
        actionButtonOptions={{ label: 'Action', onPress: jest.fn }}
      />,
    );
    const actionButton = screen.getByTestId(SHEET_HEADER_ACTION_BUTTON_ID);
    expect(actionButton).toBeTruthy();
  });
});