import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MAPickerSheet from '../MAPickerSheet';
import { useParams } from '../../../../../util/navigation/navUtils';
import { getMAOptions } from '../indicatorColors';
import { AppThemeKey } from '../../../../../util/theme/models';

const mockGoBack = jest.fn();
const mockOnCloseBottomSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'asset_overview.ma_picker_title': 'Moving average',
      'asset_overview.done': 'Done',
    };
    return translations[key] ?? key;
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Pressable, Text } = jest.requireActual('react-native');

  const BottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        goBack,
      }: {
        children?: React.ReactNode;
        goBack?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: () => void } | null>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
      }));

      return ReactActual.createElement(
        View,
        { testID: 'bottom-sheet' },
        children,
        ReactActual.createElement(Pressable, {
          testID: 'sheet-go-back',
          onPress: goBack,
        }),
      );
    },
  );

  const BottomSheetHeader = ({
    children,
    onClose,
  }: {
    children?: React.ReactNode;
    onClose?: () => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'bottom-sheet-header' },
      ReactActual.createElement(Text, null, children),
      ReactActual.createElement(Pressable, {
        testID: 'sheet-header-close',
        onPress: onClose,
      }),
    );

  const Button = ({
    children,
    onPress,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
  }) =>
    ReactActual.createElement(
      Pressable,
      { testID: 'done-button', onPress },
      ReactActual.createElement(Text, null, children),
    );

  const Checkbox = ({
    onChange,
    accessibilityLabel,
  }: {
    onChange?: () => void;
    accessibilityLabel?: string;
  }) =>
    ReactActual.createElement(Pressable, {
      testID: `checkbox-${accessibilityLabel}`,
      onPress: onChange,
    });

  return {
    ...actual,
    BottomSheet,
    BottomSheetHeader,
    Button,
    Checkbox,
  };
});

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('MAPickerSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
  });

  it('renders the sheet title and all MA options', () => {
    const { getByText, getByLabelText } = render(<MAPickerSheet />);

    expect(getByText('Moving average')).toBeOnTheScreen();
    getMAOptions(AppThemeKey.dark).forEach(({ label }) => {
      expect(getByLabelText(label)).toBeOnTheScreen();
    });
  });

  it('initializes selection from selectedMAs params', () => {
    mockUseParams.mockReturnValue({ selectedMAs: ['MA5', 'MA20'] });

    const { getByLabelText } = render(<MAPickerSheet />);

    expect(getByLabelText('MA5').props.accessibilityState).toEqual({
      checked: true,
    });
    expect(getByLabelText('MA20').props.accessibilityState).toEqual({
      checked: true,
    });
    expect(getByLabelText('MA10').props.accessibilityState).toEqual({
      checked: false,
    });
  });

  describe('handleToggle', () => {
    it('selects an MA when its row is pressed', () => {
      const { getByLabelText } = render(<MAPickerSheet />);

      fireEvent.press(getByLabelText('MA10'));

      expect(getByLabelText('MA10').props.accessibilityState).toEqual({
        checked: true,
      });
    });

    it('deselects an MA when its row is pressed again', () => {
      mockUseParams.mockReturnValue({ selectedMAs: ['MA5'] });
      const { getByLabelText } = render(<MAPickerSheet />);

      fireEvent.press(getByLabelText('MA5'));

      expect(getByLabelText('MA5').props.accessibilityState).toEqual({
        checked: false,
      });
    });

    it('toggles selection via checkbox onChange', () => {
      const { getByTestId, getByLabelText } = render(<MAPickerSheet />);

      fireEvent.press(getByTestId('checkbox-MA50'));

      expect(getByLabelText('MA50').props.accessibilityState).toEqual({
        checked: true,
      });
    });
  });

  describe('handleClose', () => {
    it('closes the sheet when the header close button is pressed', () => {
      const { getByTestId } = render(<MAPickerSheet />);

      fireEvent.press(getByTestId('sheet-header-close'));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleDone', () => {
    it('calls onDone with the current selection and closes the sheet', () => {
      const onDone = jest.fn();
      mockUseParams.mockReturnValue({ selectedMAs: ['MA5'], onDone });
      const { getByTestId, getByLabelText } = render(<MAPickerSheet />);

      fireEvent.press(getByLabelText('MA20'));
      fireEvent.press(getByTestId('done-button'));

      expect(onDone).toHaveBeenCalledWith(['MA5', 'MA20']);
      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('closes the sheet without calling onDone when callback is omitted', () => {
      const { getByTestId } = render(<MAPickerSheet />);

      fireEvent.press(getByTestId('done-button'));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleGoBack', () => {
    it('navigates back when the sheet goBack handler is invoked', () => {
      const { getByTestId } = render(<MAPickerSheet />);

      fireEvent.press(getByTestId('sheet-go-back'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
