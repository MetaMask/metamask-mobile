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
    const component = render(<SheetHeader title={'Title'} />);
    expect(component).toMatchSnapshot();
  });

  it('should render back button', () => {
    render(<SheetHeader onBack={jest.fn} title={'Title'} />);
    expect(screen.getByTestId(SHEET_HEADER_BACK_BUTTON_ID)).toBeDefined();
  });

  it('should render action button', () => {
    render(
      <SheetHeader
        title={'Title'}
        actionButtonOptions={{ label: 'Action', onPress: jest.fn }}
      />,
    );
    expect(screen.getByTestId(SHEET_HEADER_ACTION_BUTTON_ID)).toBeDefined();
  });
});
