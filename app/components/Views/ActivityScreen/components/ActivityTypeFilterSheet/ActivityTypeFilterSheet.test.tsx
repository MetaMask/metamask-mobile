import React from 'react';
import { render } from '@testing-library/react-native';
import ActivityTypeFilterSheet, {
  ACTIVITY_TYPE_FILTER_LABEL_KEY,
} from './ActivityTypeFilterSheet';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { ACTIVITY_TYPE_FILTER_ORDER, ActivityTypeFilter } from '../../types';
import { strings } from '../../../../../../locales/i18n';

// The generic sheet behaviour is covered by FilterOptionSheet.test.tsx; here we
// only assert the wrapper wires the right options, labels, and testIDs.
const mockFilterOptionSheet = jest.fn();
jest.mock('../FilterOptionSheet', () => ({
  FilterOptionSheet: (props: Record<string, unknown>) => {
    mockFilterOptionSheet(props);
    return null;
  },
}));

describe('ActivityTypeFilterSheet', () => {
  beforeEach(() => mockFilterOptionSheet.mockClear());

  const lastProps = () =>
    mockFilterOptionSheet.mock.calls[
      mockFilterOptionSheet.mock.calls.length - 1
    ][0] as {
      title: string;
      options: ActivityTypeFilter[];
      selected: ActivityTypeFilter;
      getLabel: (f: ActivityTypeFilter) => string;
      sheetTestID: string;
      getOptionTestID: (f: ActivityTypeFilter) => string;
      onSelect: (f: ActivityTypeFilter) => void;
      onClose: () => void;
    };

  it('passes the type-filter order, selection, and sheet testID through', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    render(
      <ActivityTypeFilterSheet
        selected={ActivityTypeFilter.Perps}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    const props = lastProps();
    expect(props.options).toBe(ACTIVITY_TYPE_FILTER_ORDER);
    expect(props.selected).toBe(ActivityTypeFilter.Perps);
    expect(props.sheetTestID).toBe(
      ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET,
    );
    expect(props.onSelect).toBe(onSelect);
    expect(props.onClose).toBe(onClose);
  });

  it('resolves labels and option testIDs from the type-filter maps', () => {
    render(
      <ActivityTypeFilterSheet
        selected={ActivityTypeFilter.Transactions}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const props = lastProps();
    expect(props.getLabel(ActivityTypeFilter.Money)).toBe(
      strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[ActivityTypeFilter.Money]),
    );
    expect(props.getOptionTestID(ActivityTypeFilter.Money)).toBe(
      `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${ActivityTypeFilter.Money}`,
    );
  });

  it('exports an i18n label key for every filter', () => {
    for (const filter of ACTIVITY_TYPE_FILTER_ORDER) {
      expect(ACTIVITY_TYPE_FILTER_LABEL_KEY[filter]).toMatch(
        /^activity_view\.type_filter\./,
      );
    }
  });
});
