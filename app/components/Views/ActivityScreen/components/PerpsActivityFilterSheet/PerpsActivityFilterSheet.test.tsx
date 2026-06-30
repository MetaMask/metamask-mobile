import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsActivityFilterSheet, {
  PERPS_ACTIVITY_FILTER_LABEL_KEY,
} from './PerpsActivityFilterSheet';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { PERPS_ACTIVITY_FILTER_ORDER, PerpsActivityFilter } from '../../types';

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

const renderSheet = (
  overrides: Partial<
    React.ComponentProps<typeof PerpsActivityFilterSheet>
  > = {},
) =>
  render(
    <PerpsActivityFilterSheet
      selected={PerpsActivityFilter.Trades}
      onSelect={jest.fn()}
      onClose={jest.fn()}
      {...overrides}
    />,
  );

const optionTestId = (filter: PerpsActivityFilter) =>
  `${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${filter}`;

describe('PerpsActivityFilterSheet', () => {
  beforeEach(() => {
    mockOnCloseBottomSheet.mockClear();
  });

  it('renders the sheet container with the expected testID', () => {
    renderSheet();
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.PERPS_FILTER_SHEET),
    ).toBeOnTheScreen();
  });

  it('renders one row per filter in PERPS_ACTIVITY_FILTER_ORDER', () => {
    renderSheet();
    for (const filter of PERPS_ACTIVITY_FILTER_ORDER) {
      expect(screen.getByTestId(optionTestId(filter))).toBeOnTheScreen();
    }
  });

  it('shows a check icon only on the selected row', () => {
    renderSheet({ selected: PerpsActivityFilter.Deposits });

    const selectedRow = screen.getByTestId(
      optionTestId(PerpsActivityFilter.Deposits),
    );
    expect(selectedRow).toHaveProp('accessibilityState', { selected: true });

    const unselectedRow = screen.getByTestId(
      optionTestId(PerpsActivityFilter.Trades),
    );
    expect(unselectedRow).toHaveProp('accessibilityState', { selected: false });
  });

  it('calls onSelect, closes the sheet, and forwards onClose so the parent can re-open it', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    renderSheet({ onSelect, onClose });

    fireEvent.press(
      screen.getByTestId(optionTestId(PerpsActivityFilter.Order)),
    );

    expect(onSelect).toHaveBeenCalledWith(PerpsActivityFilter.Order);
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockOnCloseBottomSheet).toHaveBeenCalledWith(onClose);
  });

  it('invokes onClose when the sheet dispatches its close event', () => {
    const onClose = jest.fn();
    renderSheet({ onClose });

    fireEvent.press(screen.getByTestId('mock-bottom-sheet-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exports an i18n label key for every filter', () => {
    for (const filter of PERPS_ACTIVITY_FILTER_ORDER) {
      expect(PERPS_ACTIVITY_FILTER_LABEL_KEY[filter]).toMatch(
        /^activity_view\.perps_filter\./,
      );
    }
  });
});
