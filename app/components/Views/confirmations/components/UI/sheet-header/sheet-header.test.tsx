import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';

import { ConfirmationSheetHeader } from './sheet-header';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../../../../component-library/components-temp/CapsuleGlass',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <View testID="capsule">{children}</View>
      ),
    };
  },
);

const renderHeader = (onClose = jest.fn()) =>
  render(
    <ConfirmationSheetHeader
      onClose={onClose}
      closeButtonProps={{ testID: 'close' }}
    >
      Network fee
    </ConfirmationSheetHeader>,
  );

describe('ConfirmationSheetHeader', () => {
  it('renders glass buttons when the glass headers flag is on', () => {
    jest.mocked(useSelector).mockReturnValue(true);

    const { getByText, getByTestId } = renderHeader();

    expect(getByText('Network fee')).toBeOnTheScreen();
    expect(getByTestId('capsule')).toBeOnTheScreen();
  });

  it('renders the plain header when the flag is off', () => {
    jest.mocked(useSelector).mockReturnValue(false);

    const { queryByTestId } = renderHeader();

    expect(queryByTestId('capsule')).not.toBeOnTheScreen();
  });

  it('calls onClose when the close button is pressed', () => {
    jest.mocked(useSelector).mockReturnValue(false);
    const onClose = jest.fn();

    const { getByTestId } = renderHeader(onClose);
    fireEvent.press(getByTestId('close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
