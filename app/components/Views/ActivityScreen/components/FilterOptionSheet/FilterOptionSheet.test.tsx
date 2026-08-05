import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  FilterOptionSheet,
  type FilterOptionSheetProps,
} from './FilterOptionSheet';

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
          onOpen,
          goBack,
          isInteractable,
          testID,
        }: {
          children?: React.ReactNode;
          onClose?: (hasCallback?: boolean) => void;
          onOpen?: () => void;
          goBack?: () => void;
          isInteractable?: boolean;
          testID?: string;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        React.useEffect(() => {
          onOpen?.();
        }, [onOpen]);
        React.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            mockOnCloseBottomSheet(callback);
            goBack?.();
            onClose?.(Boolean(callback));
            callback?.();
          },
        }));
        return (
          <ReactNative.View testID={testID}>
            {children}
            <ReactNative.TouchableOpacity
              testID="mock-bottom-sheet-close"
              disabled={isInteractable === false}
              onPress={() => {
                goBack?.();
                onClose?.(false);
              }}
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

  it('calls onSelect then closes the sheet (OptionsSheet pattern)', () => {
    const onSelect = jest.fn();
    const goBack = jest.fn();
    renderSheet({ onSelect, goBack });

    fireEvent.press(screen.getByTestId(optionTestId('gamma')));

    expect(onSelect).toHaveBeenCalledWith('gamma');
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('invokes goBack and onClose when the sheet dispatches its close event', () => {
    const onClose = jest.fn();
    const goBack = jest.fn();
    renderSheet({ onClose, goBack });

    fireEvent.press(screen.getByTestId('mock-bottom-sheet-close'));

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
