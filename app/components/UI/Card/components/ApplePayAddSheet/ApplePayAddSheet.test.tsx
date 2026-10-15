import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ApplePayAddSheet from './ApplePayAddSheet';
import { ApplePayAddSheetSelectors } from './ApplePayAddSheet.testIds';

const mockGoBack = jest.fn();
const mockOnCloseBottomSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<
    typeof import('@metamask/design-system-react-native')
  >('@metamask/design-system-react-native');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');

  const BottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
      }: {
        children: React.ReactNode;
        testID?: string;
      },
      ref: React.Ref<{ onCloseBottomSheet: () => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
      }));
      return ReactActual.createElement(View, { testID }, children);
    },
  );

  return {
    ...actual,
    BottomSheet,
  };
});

describe('ApplePayAddSheet', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockOnCloseBottomSheet.mockClear();
  });

  it('shows the add-to-Apple-Pay copy and graphic', () => {
    const { getByText, getByTestId } = renderWithProvider(<ApplePayAddSheet />);

    expect(getByText('Add your MetaMask Card to Apple Pay')).toBeOnTheScreen();
    expect(
      getByText(
        'Apple Pay is an easy, secure and private way to pay with your iPhone and Apple Watch.',
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        'There are no additional app downloads, sign ups or fees. Get setup in seconds.',
      ),
    ).toBeOnTheScreen();
    expect(getByTestId(ApplePayAddSheetSelectors.HERO)).toBeOnTheScreen();
  });

  it('dismisses the sheet from Got it', () => {
    const { getByTestId } = renderWithProvider(<ApplePayAddSheet />);

    fireEvent.press(getByTestId(ApplePayAddSheetSelectors.GOT_IT_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
