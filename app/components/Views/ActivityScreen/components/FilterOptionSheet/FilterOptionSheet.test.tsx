import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  FilterOptionSheet,
  type FilterOptionSheetProps,
} from './FilterOptionSheet';

// Capture the latest BottomSheet ref's close call so we can assert the sheet
// closes itself after a selection.
const mockOnCloseBottomSheet = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  const React = jest.requireActual('react');

  return {
    IconColor: { IconDefault: 'IconDefault' },
    IconName: { Check: 'Check' },
    IconSize: { Md: 'Md' },
    TextVariant: { BodyMd: 'BodyMd' },
    Box: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => <ReactNative.View testID={testID}>{children}</ReactNative.View>,
    Text: ({ children }: { children?: React.ReactNode }) => (
      <ReactNative.Text>{children}</ReactNative.Text>
    ),
    Icon: ({ name, testID }: { name?: string; testID?: string }) => (
      <ReactNative.View testID={testID ?? `icon-${name}`} />
    ),
    BottomSheet: React.forwardRef(
      (
        {
          children,
          onClose,
          testID,
        }: {
          children?: React.ReactNode;
          onClose?: () => void;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        React.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return (
          <ReactNative.View testID={testID}>
            {children}
            <ReactNative.TouchableOpacity
              testID="mock-bottom-sheet-close"
              onPress={onClose}
            />
          </ReactNative.View>
        );
      },
    ),
    BottomSheetHeader: ({ children }: { children?: React.ReactNode }) => (
      <ReactNative.View testID="mock-bottom-sheet-header">
        <ReactNative.Text>{children}</ReactNative.Text>
      </ReactNative.View>
    ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

type TestOption = 'alpha' | 'beta' | 'gamma';
const OPTIONS: TestOption[] = ['alpha', 'beta', 'gamma'];
const SHEET_TEST_ID = 'filter-option-sheet';
const optionTestId = (option: TestOption) => `filter-option-${option}`;

const baseProps: FilterOptionSheetProps<TestOption> = {
  title: 'Pick one',
  options: OPTIONS,
  selected: 'alpha',
  getLabel: (option) => `Label ${option}`,
  onSelect: jest.fn(),
  onClose: jest.fn(),
  sheetTestID: SHEET_TEST_ID,
  getOptionTestID: optionTestId,
};

const renderSheet = (
  overrides: Partial<FilterOptionSheetProps<TestOption>> = {},
) => render(<FilterOptionSheet<TestOption> {...baseProps} {...overrides} />);

describe('FilterOptionSheet', () => {
  beforeEach(() => {
    mockOnCloseBottomSheet.mockClear();
  });

  it('renders the sheet container with the provided testID', () => {
    renderSheet();
    expect(screen.getByTestId(SHEET_TEST_ID)).toBeOnTheScreen();
  });

  it('renders one row per option, with resolved labels', () => {
    renderSheet();
    for (const option of OPTIONS) {
      expect(screen.getByTestId(optionTestId(option))).toBeOnTheScreen();
      expect(screen.getByText(`Label ${option}`)).toBeOnTheScreen();
    }
  });

  it('marks only the selected row as selected', () => {
    renderSheet({ selected: 'beta' });

    expect(screen.getByTestId(optionTestId('beta'))).toHaveProp(
      'accessibilityState',
      { selected: true },
    );
    expect(screen.getByTestId(optionTestId('alpha'))).toHaveProp(
      'accessibilityState',
      { selected: false },
    );
  });

  it('calls onSelect and closes the sheet without a post-callback (avoids double onClose)', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    renderSheet({ onSelect, onClose });

    fireEvent.press(screen.getByTestId(optionTestId('gamma')));

    expect(onSelect).toHaveBeenCalledWith('gamma');
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockOnCloseBottomSheet).toHaveBeenCalledWith();
  });

  it('invokes onClose when the sheet dispatches its close event', () => {
    const onClose = jest.fn();
    renderSheet({ onClose });

    fireEvent.press(screen.getByTestId('mock-bottom-sheet-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
