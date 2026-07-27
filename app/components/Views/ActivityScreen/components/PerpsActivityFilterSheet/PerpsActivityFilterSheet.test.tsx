import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsActivityFilterSheet, {
  PERPS_ACTIVITY_FILTER_LABEL_KEY,
} from './PerpsActivityFilterSheet';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { PERPS_ACTIVITY_FILTER_ORDER, PerpsActivityFilter } from '../../types';
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

describe('PerpsActivityFilterSheet', () => {
  beforeEach(() => mockFilterOptionSheet.mockClear());

  const lastProps = () =>
    mockFilterOptionSheet.mock.calls[
      mockFilterOptionSheet.mock.calls.length - 1
    ][0] as {
      title: string;
      options: PerpsActivityFilter[];
      selected: PerpsActivityFilter;
      getLabel: (f: PerpsActivityFilter) => string;
      sheetTestID: string;
      getOptionTestID: (f: PerpsActivityFilter) => string;
      onSelect: (f: PerpsActivityFilter) => void;
      onClose: () => void;
    };

  it('passes the perps-filter order, selection, and sheet testID through', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    render(
      <PerpsActivityFilterSheet
        selected={PerpsActivityFilter.Deposits}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    const props = lastProps();
    expect(props.options).toBe(PERPS_ACTIVITY_FILTER_ORDER);
    expect(props.selected).toBe(PerpsActivityFilter.Deposits);
    expect(props.sheetTestID).toBe(
      ActivityScreenSelectorsIDs.PERPS_FILTER_SHEET,
    );
    expect(props.onSelect).toBe(onSelect);
    expect(props.onClose).toBe(onClose);
  });

  it('resolves labels and option testIDs from the perps-filter maps', () => {
    render(
      <PerpsActivityFilterSheet
        selected={PerpsActivityFilter.Trades}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const props = lastProps();
    expect(props.getLabel(PerpsActivityFilter.Order)).toBe(
      strings(PERPS_ACTIVITY_FILTER_LABEL_KEY[PerpsActivityFilter.Order]),
    );
    expect(props.getOptionTestID(PerpsActivityFilter.Order)).toBe(
      `${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${PerpsActivityFilter.Order}`,
    );
  });

  it('exports an i18n label key for every filter', () => {
    for (const filter of PERPS_ACTIVITY_FILTER_ORDER) {
      expect(PERPS_ACTIVITY_FILTER_LABEL_KEY[filter]).toMatch(
        /^activity_view\.perps_filter\./,
      );
    }
  });
});
