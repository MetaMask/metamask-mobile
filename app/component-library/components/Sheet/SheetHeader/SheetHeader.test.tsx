// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

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
    const { toJSON } = render(<SheetHeader onBack={jest.fn} title={'Title'} />);
    const backButton = wrapper.findWhere(
      (node) => node.prop('testID') === SHEET_HEADER_BACK_BUTTON_ID,
    );
    expect(backButton.exists()).toBe(true);
  });

  it('should render action button', () => {
    const { toJSON } = render(
      <SheetHeader
        title={'Title'}
        actionButtonOptions={{ label: 'Action', onPress: jest.fn }}
      />,
    );
    const actionButton = wrapper.findWhere(
      (node) => node.prop('testID') === SHEET_HEADER_ACTION_BUTTON_ID,
    );
    expect(actionButton.exists()).toBe(true);
  });
});
