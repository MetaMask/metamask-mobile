import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AccountPickerRowContent } from './account-picker-row';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: { accountAddress?: string }) => (
        <View testID={`avatar-${props.accountAddress}`} />
      ),
      AvatarVariant: { Account: 'Account' },
      AvatarSize: { Sm: 'Sm', Md: 'Md' },
    };
  },
);

const TEST_IDS = {
  ROW: 'account-picker-row',
  SHEET: 'account-picker-sheet',
  SEARCH_INPUT: 'account-picker-search',
  ACCOUNT_ITEM: 'account-picker-item',
};

const ACCOUNTS = [
  { id: '0xabc', name: 'Account One' },
  { id: '0xdef', name: 'Account Two' },
];

describe('AccountPickerRowContent', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when there are no sub-accounts', () => {
    const { toJSON } = render(
      <AccountPickerRowContent
        subAccounts={[]}
        selectedSubAccount={null}
        onSelect={onSelect}
        formatBalance={() => '$0'}
        title="Select account"
        searchPlaceholder="Search"
        testIDs={TEST_IDS}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('opens the bottom sheet with BottomSheetHeader title', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <AccountPickerRowContent
        subAccounts={ACCOUNTS}
        selectedSubAccount={ACCOUNTS[0]}
        onSelect={onSelect}
        formatBalance={(account) => `$${account.name}`}
        title="Select account"
        searchPlaceholder="Search"
        testIDs={TEST_IDS}
      />,
    );

    expect(queryByTestId(TEST_IDS.SHEET)).toBeNull();

    fireEvent.press(getByTestId(TEST_IDS.ROW));

    expect(getByTestId(TEST_IDS.SHEET)).toBeOnTheScreen();
    expect(getByText('Select account')).toBeOnTheScreen();
  });

  it('filters accounts by search query', () => {
    const { getByTestId, queryByTestId } = render(
      <AccountPickerRowContent
        subAccounts={ACCOUNTS}
        selectedSubAccount={ACCOUNTS[0]}
        onSelect={onSelect}
        formatBalance={() => '$1'}
        title="Select account"
        searchPlaceholder="Search"
        testIDs={TEST_IDS}
      />,
    );

    fireEvent.press(getByTestId(TEST_IDS.ROW));
    fireEvent.changeText(getByTestId(TEST_IDS.SEARCH_INPUT), 'Two');

    expect(queryByTestId(`${TEST_IDS.ACCOUNT_ITEM}-0xabc`)).toBeNull();
    expect(getByTestId(`${TEST_IDS.ACCOUNT_ITEM}-0xdef`)).toBeOnTheScreen();
  });

  it('calls onSelect when an account is pressed', () => {
    const { getByTestId } = render(
      <AccountPickerRowContent
        subAccounts={ACCOUNTS}
        selectedSubAccount={ACCOUNTS[0]}
        onSelect={onSelect}
        formatBalance={() => '$1'}
        title="Select account"
        searchPlaceholder="Search"
        testIDs={TEST_IDS}
      />,
    );

    fireEvent.press(getByTestId(TEST_IDS.ROW));
    fireEvent.press(getByTestId(`${TEST_IDS.ACCOUNT_ITEM}-0xdef`));

    expect(onSelect).toHaveBeenCalledWith('0xdef');
  });

  it('renders fallback label when no account is selected', () => {
    const { getAllByText } = render(
      <AccountPickerRowContent
        subAccounts={ACCOUNTS}
        selectedSubAccount={null}
        onSelect={onSelect}
        formatBalance={() => '$1'}
        title="Select account"
        searchPlaceholder="Search"
        testIDs={TEST_IDS}
      />,
    );

    expect(getAllByText('confirm.label.to').length).toBeGreaterThan(0);
  });
});
