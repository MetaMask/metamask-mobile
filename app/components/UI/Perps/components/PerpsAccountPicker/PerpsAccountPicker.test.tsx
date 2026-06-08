import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import type { SubAccountInfo } from '../../types/subAccount';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsAccountPickerSelectorsIDs } from '../../Perps.testIds';
import PerpsAccountPicker from './PerpsAccountPicker';

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsBalance: (val: string) => `$${val}`,
}));
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../component-library/hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      rowContainer: {},
      row: {},
      valueContainer: {},
      modalRoot: {},
      searchContainer: {},
      searchInput: {},
      list: {},
      accountItem: {},
      accountItemSelected: {},
      accountItemLeft: {},
    },
  }),
}));

jest.mock('../../../../../util/theme/themeUtils', () => ({
  useElevatedSurface: () => 'surface-elevated',
}));

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const RN = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RR = require('react');
  const MockIcon = (props: Record<string, unknown>) =>
    RR.createElement(RN.View, { testID: `mock-icon-${props.name}` });
  MockIcon.displayName = 'MockIcon';
  return {
    __esModule: true,
    default: MockIcon,
    IconColor: { Alternative: 'Alternative' },
    IconName: { Search: 'Search', ArrowDown: 'ArrowDown' },
    IconSize: { Sm: 'Sm', Md: 'Md' },
  };
});

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => {
  const RN = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RR = require('react');
  const MockAvatar = (props: Record<string, unknown>) =>
    RR.createElement(RN.View, {
      testID: `mock-avatar-${props.accountAddress}`,
    });
  MockAvatar.displayName = 'MockAvatar';
  return {
    __esModule: true,
    default: MockAvatar,
    AvatarSize: { Sm: 'Sm', Md: 'Md' },
    AvatarVariant: { Account: 'Account' },
  };
});

const MOCK_ACCOUNTS: SubAccountInfo[] = [
  {
    id: '0xabc',
    name: 'Account 1 (Perps)',
    spendableBalance: '100',
    withdrawableBalance: '50',
    totalBalance: '150',
  },
  {
    id: '0xdef',
    name: 'Account 2 (Perps)',
    spendableBalance: '200',
    withdrawableBalance: '100',
    totalBalance: '300',
  },
];

const STATE_MOCK = {
  engine: {
    backgroundState,
  },
};

describe('PerpsAccountPicker', () => {
  const onSelectMock = jest.fn();
  const onCloseMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { queryByTestId } = renderWithProvider(
      <PerpsAccountPicker
        visible={false}
        accounts={MOCK_ACCOUNTS}
        selectedAccountId="0xabc"
        onSelect={onSelectMock}
        onClose={onCloseMock}
      />,
      { state: STATE_MOCK },
    );

    expect(queryByTestId(PerpsAccountPickerSelectorsIDs.SHEET)).toBeNull();
  });

  it('renders account list when visible', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsAccountPicker
        visible
        accounts={MOCK_ACCOUNTS}
        selectedAccountId="0xabc"
        onSelect={onSelectMock}
        onClose={onCloseMock}
      />,
      { state: STATE_MOCK },
    );

    expect(getByTestId(PerpsAccountPickerSelectorsIDs.SHEET)).toBeDefined();
    expect(
      getByTestId(`${PerpsAccountPickerSelectorsIDs.ACCOUNT_ITEM}-0xabc`),
    ).toBeDefined();
    expect(
      getByTestId(`${PerpsAccountPickerSelectorsIDs.ACCOUNT_ITEM}-0xdef`),
    ).toBeDefined();
  });

  it('displays formatted balances', () => {
    const { getByText } = renderWithProvider(
      <PerpsAccountPicker
        visible
        accounts={MOCK_ACCOUNTS}
        selectedAccountId={null}
        onSelect={onSelectMock}
        onClose={onCloseMock}
      />,
      { state: STATE_MOCK },
    );

    expect(getByText('$150')).toBeDefined();
    expect(getByText('$300')).toBeDefined();
  });

  it('filters accounts by search query', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsAccountPicker
        visible
        accounts={MOCK_ACCOUNTS}
        selectedAccountId={null}
        onSelect={onSelectMock}
        onClose={onCloseMock}
      />,
      { state: STATE_MOCK },
    );

    fireEvent.changeText(
      getByTestId(PerpsAccountPickerSelectorsIDs.SEARCH_INPUT),
      'Account 1',
    );

    expect(
      getByTestId(`${PerpsAccountPickerSelectorsIDs.ACCOUNT_ITEM}-0xabc`),
    ).toBeDefined();
    expect(
      queryByTestId(`${PerpsAccountPickerSelectorsIDs.ACCOUNT_ITEM}-0xdef`),
    ).toBeNull();
  });

  it('calls onSelect when an account is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsAccountPicker
        visible
        accounts={MOCK_ACCOUNTS}
        selectedAccountId={null}
        onSelect={onSelectMock}
        onClose={onCloseMock}
      />,
      { state: STATE_MOCK },
    );

    fireEvent.press(
      getByTestId(`${PerpsAccountPickerSelectorsIDs.ACCOUNT_ITEM}-0xdef`),
    );

    expect(onSelectMock).toHaveBeenCalledWith('0xdef');
  });
});
