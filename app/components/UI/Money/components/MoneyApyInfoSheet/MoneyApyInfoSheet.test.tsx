import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyApyInfoSheet from './MoneyApyInfoSheet';
import { MoneyApyInfoSheetTestIds } from './MoneyApyInfoSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import AppConstants from '../../../../../core/AppConstants';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(View, { testID }, children);
    },
  );

  const MockBottomSheetHeader = ({
    children,
    onClose,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'bottom-sheet-header' },
      ReactActual.createElement(
        Pressable,
        { testID: 'bottom-sheet-close-button', onPress: onClose },
        ReactActual.createElement(RNText, {}, 'close'),
      ),
      children,
    );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

const DEFAULT_APY = 5;

describe('MoneyApyInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ apy: DEFAULT_APY });
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(getByTestId(MoneyApyInfoSheetTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the sheet title', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(getByText(strings('money.apy_tooltip.title'))).toBeOnTheScreen();
  });

  it('renders paragraph_1 with the apy percentage interpolated', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(
        strings('money.apy_tooltip.paragraph_1', { percentage: DEFAULT_APY }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders paragraph_2', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.paragraph_2')),
    ).toBeOnTheScreen();
  });

  it('renders paragraph_3', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.paragraph_3')),
    ).toBeOnTheScreen();
  });

  it('renders the Learn More footer button', () => {
    const { getByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByTestId(MoneyApyInfoSheetTestIds.LEARN_MORE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders the correct label on the Learn More button', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.learn_more')),
    ).toBeOnTheScreen();
  });

  it('opens the learn more URL when the footer button is pressed', () => {
    const openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);

    const { getByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    fireEvent.press(getByTestId(MoneyApyInfoSheetTestIds.LEARN_MORE_BUTTON));

    expect(openURLSpy).toHaveBeenCalledWith(AppConstants.URLS.MUSD_LEARN_MORE);
  });

  it('does not close the sheet when the Learn More button is pressed', () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const { getByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    fireEvent.press(getByTestId(MoneyApyInfoSheetTestIds.LEARN_MORE_BUTTON));

    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    fireEvent.press(getByTestId('bottom-sheet-close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
