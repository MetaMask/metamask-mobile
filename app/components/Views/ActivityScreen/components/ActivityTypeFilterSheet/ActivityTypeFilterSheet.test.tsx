import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ActivityTypeFilterSheet, {
  ACTIVITY_TYPE_FILTER_LABEL_KEY,
} from './ActivityTypeFilterSheet';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { ACTIVITY_TYPE_FILTER_ORDER, ActivityTypeFilter } from '../../types';

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
  overrides: Partial<React.ComponentProps<typeof ActivityTypeFilterSheet>> = {},
) =>
  render(
    <ActivityTypeFilterSheet
      selected={ActivityTypeFilter.All}
      onSelect={jest.fn()}
      onClose={jest.fn()}
      {...overrides}
    />,
  );

const optionTestId = (filter: ActivityTypeFilter) =>
  `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${filter}`;

describe('ActivityTypeFilterSheet', () => {
  beforeEach(() => {
    mockOnCloseBottomSheet.mockClear();
  });

  it('renders the sheet container with the expected testID', () => {
    renderSheet();
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET),
    ).toBeOnTheScreen();
  });

  it('renders one row per filter in ACTIVITY_TYPE_FILTER_ORDER', () => {
    renderSheet();
    for (const filter of ACTIVITY_TYPE_FILTER_ORDER) {
      expect(screen.getByTestId(optionTestId(filter))).toBeOnTheScreen();
    }
  });

  it('shows a check icon only on the selected row', () => {
    renderSheet({ selected: ActivityTypeFilter.Perps });

    const selectedRow = screen.getByTestId(
      optionTestId(ActivityTypeFilter.Perps),
    );
    expect(selectedRow).toHaveProp('accessibilityState', { selected: true });

    const unselectedRow = screen.getByTestId(
      optionTestId(ActivityTypeFilter.Transactions),
    );
    expect(unselectedRow).toHaveProp('accessibilityState', { selected: false });
  });

  it('calls onSelect, closes the sheet, and forwards onClose so the parent can re-open it', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    renderSheet({ onSelect, onClose });

    fireEvent.press(screen.getByTestId(optionTestId(ActivityTypeFilter.Money)));

    expect(onSelect).toHaveBeenCalledWith(ActivityTypeFilter.Money);
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
    for (const filter of ACTIVITY_TYPE_FILTER_ORDER) {
      expect(ACTIVITY_TYPE_FILTER_LABEL_KEY[filter]).toMatch(
        /^activity_view\.type_filter\./,
      );
    }
  });
});
