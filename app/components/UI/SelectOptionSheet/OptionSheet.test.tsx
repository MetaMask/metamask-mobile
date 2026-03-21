import { renderScreen } from '../../../util/test/renderWithProvider';
import React from 'react';
import OptionsSheet from './OptionsSheet';
import Routes from '../../../constants/navigation/Routes';
import { SELECT_OPTION_PREFIX } from './constants';
import { fireEvent } from '@testing-library/react-native';
import { ISelectOptionSheet } from './types';

function render(Component: React.ComponentType) {
  return renderScreen(Component, {
    name: Routes.OPTIONS_SHEET,
  });
}

const mockOnCloseBottomSheet = jest.fn();

const mockUseParamsValues: ISelectOptionSheet = {
  options: [
    { key: 'key1', value: 'val 1', label: 'option 1' },
    { key: 'key2', value: 'val 2', label: 'option 2' },
  ],
  label: 'Select a Account',
  selectedValue: 'val 2',
  onValueChange: jest.fn(),
};

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

// Mock BottomSheet
jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (
        { children }: { children?: React.ReactNode },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => {
            mockOnCloseBottomSheet();
          },
        }));

        return ReactActual.createElement(
          View,
          { testID: 'bottom-sheet' },
          children,
        );
      },
    );
  },
);

// Mock BottomSheetHeader
jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        children,
        onClose,
      }: {
        children?: React.ReactNode;
        onClose?: () => void;
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'bottom-sheet-header' },
          ReactActual.createElement(Text, { testID: 'header-title' }, children),
          onClose &&
            ReactActual.createElement(
              TouchableOpacity,
              { testID: 'close-button', onPress: onClose },
              ReactActual.createElement(Text, {}, 'Close'),
            ),
        ),
    };
  },
);

describe('OptionSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(OptionsSheet);
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows all available options', () => {
    const { getByText } = render(OptionsSheet);
    expect(getByText('option 2')).toBeDefined();
    expect(getByText('option 1')).toBeDefined();
  });

  it('calls onValueChange when an option is selected', () => {
    const { getByTestId } = render(OptionsSheet);
    const option1 = getByTestId(SELECT_OPTION_PREFIX + 'key1');
    fireEvent.press(option1);
    expect(mockUseParamsValues.onValueChange).toHaveBeenCalledWith('val 1');
  });

  it('sorts options alphabetically by label', () => {
    // Update mock to have unsorted options
    mockUseParamsValues.options = [
      { key: 'key3', value: 'val 3', label: 'Zebra' },
      { key: 'key1', value: 'val 1', label: 'Apple' },
      { key: 'key2', value: 'val 2', label: 'Banana' },
    ];

    const { getByText, getAllByTestId } = render(OptionsSheet);

    // Verify all options are present
    expect(getByText('Apple')).toBeDefined();
    expect(getByText('Banana')).toBeDefined();
    expect(getByText('Zebra')).toBeDefined();

    // Get all option buttons in the order they appear
    const optionButtons = getAllByTestId(
      new RegExp(`^${SELECT_OPTION_PREFIX}`),
    );

    // Verify we have 3 options
    expect(optionButtons).toHaveLength(3);

    // Verify options are sorted alphabetically by checking testID order
    // testIDs contain the key, so sorted order should be key1 (Apple), key2 (Banana), key3 (Zebra)
    const testIds = optionButtons.map((button) => button.props.testID);
    expect(testIds).toEqual([
      `${SELECT_OPTION_PREFIX}key1`,
      `${SELECT_OPTION_PREFIX}key2`,
      `${SELECT_OPTION_PREFIX}key3`,
    ]);
  });

  it('keeps "all" option at the top while sorting other options alphabetically', () => {
    // Update mock to include 'all' option mixed with other options
    mockUseParamsValues.options = [
      { key: 'key3', value: 'val 3', label: 'Zebra' },
      { key: 'all', value: 'ALL', label: 'All' },
      { key: 'key1', value: 'val 1', label: 'Apple' },
      { key: 'key2', value: 'val 2', label: 'Banana' },
    ];

    const { getAllByTestId } = render(OptionsSheet);

    // Get all option buttons in the order they appear
    const optionButtons = getAllByTestId(
      new RegExp(`^${SELECT_OPTION_PREFIX}`),
    );

    // Verify we have 4 options
    expect(optionButtons).toHaveLength(4);

    // Verify 'all' is first, then remaining options are sorted alphabetically
    const testIds = optionButtons.map((button) => button.props.testID);
    expect(testIds).toEqual([
      `${SELECT_OPTION_PREFIX}all`,
      `${SELECT_OPTION_PREFIX}key1`,
      `${SELECT_OPTION_PREFIX}key2`,
      `${SELECT_OPTION_PREFIX}key3`,
    ]);
  });

  it('renders close button in header', () => {
    const { getByTestId } = render(OptionsSheet);
    const closeButton = getByTestId('close-button');
    expect(closeButton).toBeDefined();
  });

  it('calls onCloseBottomSheet when close button is pressed', () => {
    const { getByTestId } = render(OptionsSheet);
    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
