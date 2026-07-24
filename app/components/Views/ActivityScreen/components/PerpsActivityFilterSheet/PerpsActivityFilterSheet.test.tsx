import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsActivityFilterSheet, {
  PERPS_ACTIVITY_FILTER_LABEL_KEY,
  createPerpsActivityFilterNavDetails,
} from './PerpsActivityFilterSheet';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { PERPS_ACTIVITY_FILTER_ORDER, PerpsActivityFilter } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockOnSelect = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (root: string, screen: string) => (params?: unknown) =>
      [root, { screen, params }] as const,
  useParams: () => ({
    selected: 'deposit',
    onSelect: mockOnSelect,
  }),
}));

const mockFilterOptionSheet = jest.fn();
jest.mock('../FilterOptionSheet', () => ({
  FilterOptionSheet: (props: Record<string, unknown>) => {
    mockFilterOptionSheet(props);
    return null;
  },
}));

describe('PerpsActivityFilterSheet', () => {
  beforeEach(() => {
    mockFilterOptionSheet.mockClear();
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockOnSelect.mockClear();
    mockCanGoBack.mockReturnValue(true);
  });

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
      goBack: () => void;
    };

  it('passes the perps-filter order, selection, and sheet testID through', () => {
    render(<PerpsActivityFilterSheet />);

    const props = lastProps();
    expect(props.options).toBe(PERPS_ACTIVITY_FILTER_ORDER);
    expect(props.selected).toBe(PerpsActivityFilter.Deposits);
    expect(props.sheetTestID).toBe(
      ActivityScreenSelectorsIDs.PERPS_FILTER_SHEET,
    );
    expect(props.onSelect).toBe(mockOnSelect);
  });

  it('resolves labels and option testIDs from the perps-filter maps', () => {
    render(<PerpsActivityFilterSheet />);

    const props = lastProps();
    expect(props.getLabel(PerpsActivityFilter.Order)).toBe(
      strings(PERPS_ACTIVITY_FILTER_LABEL_KEY[PerpsActivityFilter.Order]),
    );
    expect(props.getOptionTestID(PerpsActivityFilter.Order)).toBe(
      `${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${PerpsActivityFilter.Order}`,
    );
  });

  it('exports createPerpsActivityFilterNavDetails targeting ROOT_MODAL_FLOW', () => {
    const onSelect = jest.fn();
    expect(
      createPerpsActivityFilterNavDetails({
        selected: PerpsActivityFilter.Trades,
        onSelect,
      }),
    ).toEqual([
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.SHEET.ACTIVITY_PERPS_FILTER,
        params: {
          selected: PerpsActivityFilter.Trades,
          onSelect,
        },
      },
    ]);
  });

  it('exports an i18n label key for every filter', () => {
    for (const filter of PERPS_ACTIVITY_FILTER_ORDER) {
      expect(PERPS_ACTIVITY_FILTER_LABEL_KEY[filter]).toMatch(
        /^activity_view\.perps_filter\./,
      );
    }
  });
});
