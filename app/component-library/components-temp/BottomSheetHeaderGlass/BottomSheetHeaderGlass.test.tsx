import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import BottomSheetHeaderGlass from './BottomSheetHeaderGlass';
import { FLOATING_HEADER_FADE_TEST_ID } from '../HeaderGlass';

jest.mock('../CapsuleGlass', () => {
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View testID="capsule">{children}</View>
    ),
  };
});

describe('BottomSheetHeaderGlass', () => {
  it('renders the plain MMDS header when glass is off', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <BottomSheetHeaderGlass
        isGlass={false}
        onClose={jest.fn()}
        closeButtonProps={{ testID: 'close' }}
      >
        Sort by
      </BottomSheetHeaderGlass>,
    );

    expect(getByText('Sort by')).toBeOnTheScreen();
    expect(getByTestId('close')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).not.toBeOnTheScreen();
  });

  it('renders back and close in separate glass capsules', () => {
    const onBack = jest.fn();
    const onClose = jest.fn();
    const { getByTestId, getAllByTestId } = render(
      <BottomSheetHeaderGlass
        onBack={onBack}
        backButtonProps={{ testID: 'back' }}
        onClose={onClose}
        closeButtonProps={{ testID: 'close' }}
      >
        Network fee
      </BottomSheetHeaderGlass>,
    );

    expect(getAllByTestId('capsule')).toHaveLength(2);

    fireEvent.press(getByTestId('back'));
    fireEvent.press(getByTestId('close'));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders no capsules for a title-only header', () => {
    const { getByText, queryByTestId } = render(
      <BottomSheetHeaderGlass>Types</BottomSheetHeaderGlass>,
    );

    expect(getByText('Types')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).not.toBeOnTheScreen();
  });

  it('stays in flow without a floating backdrop', () => {
    const { queryByTestId } = render(
      <BottomSheetHeaderGlass onClose={jest.fn()}>
        Sort by
      </BottomSheetHeaderGlass>,
    );

    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).not.toBeOnTheScreen();
  });

  it('forwards header props such as testID and textProps', () => {
    const { getByTestId } = render(
      <BottomSheetHeaderGlass testID="header" textProps={{ testID: 'title' }}>
        Sort by
      </BottomSheetHeaderGlass>,
    );

    expect(getByTestId('header')).toBeOnTheScreen();
    expect(getByTestId('title')).toBeOnTheScreen();
  });
});
