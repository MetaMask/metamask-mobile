import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ProfileOptionsSheet from './ProfileOptionsSheet';
import { ProfileOptionsSheetSelectorsIDs } from './ProfileOptionsSheet.testIds';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        testID?: string;
        onClose?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: () => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: () => props.onClose?.(),
      }));
      return ReactActual.createElement(
        View,
        { testID: props.testID },
        props.children,
      );
    },
  );
  return { ...actual, BottomSheet: MockBottomSheet };
});

describe('ProfileOptionsSheet', () => {
  const onBlock = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSheet = () =>
    renderWithProvider(
      <ProfileOptionsSheet
        traderName="doji"
        onBlock={onBlock}
        onClose={onClose}
      />,
    );

  it('renders the title, description, and block action', () => {
    renderSheet();

    expect(screen.getByText('Profile options')).toBeOnTheScreen();
    expect(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(
      "Blocking hides this profile's posts and positions on this device for this session. It also unfollows them.",
    );
    expect(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.BLOCK_BUTTON),
    ).toHaveTextContent('Block @doji');
  });

  it('blocks and closes the sheet when Block is pressed', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.BLOCK_BUTTON),
    );

    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not block when the sheet is dismissed', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(ProfileOptionsSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(onBlock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
