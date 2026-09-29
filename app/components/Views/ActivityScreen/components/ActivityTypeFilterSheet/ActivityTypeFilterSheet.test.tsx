import React from 'react';
import { render } from '@testing-library/react-native';
import ActivityTypeFilterSheet, {
  ACTIVITY_TYPE_FILTER_LABEL_KEY,
  createActivityTypeFilterNavDetails,
} from './ActivityTypeFilterSheet';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { ACTIVITY_TYPE_FILTER_ORDER, ActivityTypeFilter } from '../../types';
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
    selected: 'perps',
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

describe('ActivityTypeFilterSheet', () => {
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
      options: ActivityTypeFilter[];
      selected: ActivityTypeFilter;
      getLabel: (f: ActivityTypeFilter) => string;
      sheetTestID: string;
      getOptionTestID: (f: ActivityTypeFilter) => string;
      onSelect: (f: ActivityTypeFilter) => void;
      onClose: () => void;
      goBack: () => void;
    };

  it('passes the type-filter order, selection, and sheet testID through', () => {
    render(<ActivityTypeFilterSheet />);

    const props = lastProps();
    expect(props.options).toBe(ACTIVITY_TYPE_FILTER_ORDER);
    expect(props.selected).toBe(ActivityTypeFilter.Perps);
    expect(props.sheetTestID).toBe(
      ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET,
    );
    expect(props.onSelect).toBe(mockOnSelect);
  });

  it('resolves labels and option testIDs from the type-filter maps', () => {
    render(<ActivityTypeFilterSheet />);

    const props = lastProps();
    expect(props.getLabel(ActivityTypeFilter.MetamaskCard)).toBe(
      strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[ActivityTypeFilter.MetamaskCard]),
    );
    expect(props.getOptionTestID(ActivityTypeFilter.MetamaskCard)).toBe(
      `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${ActivityTypeFilter.MetamaskCard}`,
    );
  });

  it('goBack dismisses the modal route when the sheet closes', () => {
    render(<ActivityTypeFilterSheet />);

    lastProps().goBack();

    expect(mockCanGoBack).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('exports createActivityTypeFilterNavDetails targeting ROOT_MODAL_FLOW', () => {
    const onSelect = jest.fn();
    expect(
      createActivityTypeFilterNavDetails({
        selected: ActivityTypeFilter.Transactions,
        onSelect,
      }),
    ).toEqual([
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.SHEET.ACTIVITY_TYPE_FILTER,
        params: {
          selected: ActivityTypeFilter.Transactions,
          onSelect,
        },
      },
    ]);
  });

  it('exports an i18n label key for every filter', () => {
    for (const filter of ACTIVITY_TYPE_FILTER_ORDER) {
      expect(ACTIVITY_TYPE_FILTER_LABEL_KEY[filter]).toMatch(
        /^activity_view\.type_filter\./,
      );
    }
  });
});
