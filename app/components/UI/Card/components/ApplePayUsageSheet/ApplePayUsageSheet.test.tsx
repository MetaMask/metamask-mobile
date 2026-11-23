import React from 'react';
import { Linking } from 'react-native';
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
    const { getByTestId } = renderWithProvider(<ApplePayUsageSheet />);

    expect(getByTestId(ApplePayUsageSheetSelectors.TITLE)).toBeOnTheScreen();
    expect(
      getByTestId(ApplePayUsageSheetSelectors.INSTRUCTIONS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ApplePayUsageSheetSelectors.MARKS_COPY),
    ).toBeOnTheScreen();
    expect(getByTestId(ApplePayUsageSheetSelectors.GRAPHIC)).toBeOnTheScreen();
    expect(getByTestId(ApplePayUsageSheetSelectors.HAND)).toBeOnTheScreen();
    expect(
      getByTestId(ApplePayUsageSheetSelectors.LEARN_MORE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ApplePayUsageSheetSelectors.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
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

  it('opens the Apple Pay learn-more page', () => {
    const { getByTestId } = renderWithProvider(<ApplePayUsageSheet />);

    fireEvent.press(getByTestId(ApplePayUsageSheetSelectors.LEARN_MORE_BUTTON));

    expect(Linking.openURL).toHaveBeenCalledWith('https://metamask.io/card');
  });

  it('opens the learn-more URL from the card feature flag', () => {
    const { getByTestId } = renderWithProvider(<ApplePayUsageSheet />, {
      state: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                cardFeature: {
                  constants: {
                    applePayLearnMoreUrl: 'https://example.com/apple-pay',
                  },
                },
              },
            },
          },
        },
      },
    });

    fireEvent.press(getByTestId(ApplePayUsageSheetSelectors.LEARN_MORE_BUTTON));

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://example.com/apple-pay',
    );
  });
});
