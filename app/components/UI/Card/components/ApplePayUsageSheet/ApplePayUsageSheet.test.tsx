import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppThemeKey } from '../../../../../util/theme/models';
import { mockTheme } from '../../../../../util/theme';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ApplePayUsageSheet from './ApplePayUsageSheet';
import { ApplePayUsageSheetSelectors } from './ApplePayUsageSheet.testIds';

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

describe('ApplePayUsageSheet', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockOnCloseBottomSheet.mockClear();
  });

  it('shows the usage copy and light payment marks', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <ApplePayUsageSheet />,
    );

    expect(getByText('Using Apple Pay')).toBeOnTheScreen();
    expect(
      getByText(
        'Simply double-click the Side Button or Home Button at anytime to pay, even from Lock Screen or while on other apps. Try it now.',
      ),
    ).toBeOnTheScreen();
    expect(
      getByText('Use Apple Pay anywhere you see these marks below.'),
    ).toBeOnTheScreen();
    expect(getByTestId(ApplePayUsageSheetSelectors.HAND)).toBeOnTheScreen();
    expect(
      getByTestId(ApplePayUsageSheetSelectors.MARKS_LIGHT),
    ).toBeOnTheScreen();
  });

  it('uses the dark payment marks', () => {
    const { getByTestId } = renderWithProvider(<ApplePayUsageSheet />, {
      theme: { ...mockTheme, themeAppearance: AppThemeKey.dark },
    });

    expect(
      getByTestId(ApplePayUsageSheetSelectors.MARKS_DARK),
    ).toBeOnTheScreen();
  });

  it('closes the sheet from Continue', () => {
    const { getByTestId } = renderWithProvider(<ApplePayUsageSheet />);

    fireEvent.press(getByTestId(ApplePayUsageSheetSelectors.CONTINUE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
