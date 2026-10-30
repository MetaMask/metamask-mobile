import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import UncountedPositionsSheet from './UncountedPositionsSheet';

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
        onOpenBottomSheet: () => undefined,
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

describe('UncountedPositionsSheet', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('explains insider, contract-creator, and unsupported-token exclusions', () => {
    renderWithProvider(<UncountedPositionsSheet onClose={onClose} />);

    expect(
      screen.getByText("Why some positions aren't counted"),
    ).toBeOnTheScreen();
    expect(screen.getByText('Insider')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'This trader got the token from an allocation before it was public.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Contract creator')).toBeOnTheScreen();
    expect(
      screen.getByText("This trader deployed the token's contract."),
    ).toBeOnTheScreen();
    expect(screen.getByText('Unsupported token')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Some tokens, like lending contracts, move funds in ways that make P&L look wildly off, so we leave them out.',
      ),
    ).toBeOnTheScreen();
  });

  it('closes when Got it is pressed', () => {
    renderWithProvider(<UncountedPositionsSheet onClose={onClose} />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SHEET_DISMISS),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the sheet header close control is pressed', () => {
    renderWithProvider(<UncountedPositionsSheet onClose={onClose} />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SHEET_CLOSE),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
