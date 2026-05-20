import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { mockTheme } from '../../../../../../util/theme';
import { PayFromRow } from './pay-from-row';
import { AvatarAccountVariant } from '@metamask/design-system-react-native';

// ── i18n ──────────────────────────────────────────────────────────────────────
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  __esModule: true,
  default: { locale: 'en-US' },
}));

// ── Styles ────────────────────────────────────────────────────────────────────
jest.mock('../../../../../../component-library/hooks/useStyles', () => ({
  useStyles: (
    styleFn: (params: { theme: typeof mockTheme }) => Record<string, unknown>,
  ) => ({ styles: styleFn({ theme: mockTheme }), theme: mockTheme }),
}));

// ── Design system ─────────────────────────────────────────────────────────────
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        onClose,
      }: { children: React.ReactNode; onClose?: () => void },
      ref: React.Ref<{ onCloseBottomSheet: () => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: () => onClose?.(),
      }));
      return <View testID="bottom-sheet">{children}</View>;
    },
  );

  return {
    AvatarAccount: ({
      address,
      size,
    }: {
      address: string;
      size: string;
      variant: string;
    }) => (
      <View testID={`avatar-account-${size}`} accessibilityLabel={address} />
    ),
    AvatarAccountSize: { Md: 'md', Sm: 'sm' },
    AvatarAccountVariant: {
      Blockies: 'blockies',
      Jazzicon: 'jazzicon',
      Maskicon: 'maskicon',
    },
    BottomSheet: MockBottomSheet,
    BottomSheetRef: {},
    FontWeight: { Medium: '500' },
    Text: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => <RNText testID={testID}>{children}</RNText>,
    TextColor: { TextAlternative: 'alternative', TextDefault: 'default' },
    TextVariant: { BodyMd: 'bodyMd' },
  };
});

// ── Icon ──────────────────────────────────────────────────────────────────────
jest.mock('../../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
    IconColor: { Alternative: 'alternative' },
    IconName: { ArrowDown: 'ArrowDown', Close: 'Close' },
    IconSize: { Sm: 'sm', Md: 'md' },
  };
});

// ── HeaderCompactStandard ─────────────────────────────────────────────────────
jest.mock(
  '../../../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return ({ title, onClose }: { title: string; onClose?: () => void }) => (
      <View>
        <Text>{title}</Text>
        <Pressable
          testID="header-close-button"
          accessibilityRole="button"
          onPress={onClose}
        />
      </View>
    );
  },
);

// ── Modal passthrough ─────────────────────────────────────────────────────────
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    ...ReactNative,
    Modal: ({
      children,
      visible,
      testID,
    }: {
      children: React.ReactNode;
      visible?: boolean;
      testID?: string;
    }) => {
      if (!visible) return null;
      return <ReactNative.View testID={testID}>{children}</ReactNative.View>;
    },
  };
});

// ── PaymentMethodRow ──────────────────────────────────────────────────────────
jest.mock('../../UI/payment-method-row/payment-method-row', () => {
  const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
  return ({
    id,
    title,
    isSelected,
    trailingElement,
    onPress,
  }: {
    id: string;
    title: string;
    isSelected?: boolean;
    trailingElement?: React.ReactNode;
    onPress?: () => void;
    icon?: React.ReactNode;
  }) => (
    <TouchableOpacity testID={`payment-row-${id}`} onPress={onPress}>
      <Text testID={`payment-row-${id}-title`}>{title}</Text>
      {isSelected && (
        <Text testID={`payment-row-${id}-selected`}>selected</Text>
      )}
      {trailingElement && (
        <View testID={`payment-row-${id}-trailing`}>{trailingElement}</View>
      )}
    </TouchableOpacity>
  );
});

// ── Money account image ───────────────────────────────────────────────────────
jest.mock('../../../../../../images/money-account.png', () => 1);

// ── useGlobalAccount ──────────────────────────────────────────────────────────
jest.mock('./useGlobalAccount', () => ({
  useGlobalAccount: jest.fn(),
}));

// ── useMoneyAccountBalance ────────────────────────────────────────────────────
jest.mock('../../../../../UI/Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { useGlobalAccount } from './useGlobalAccount';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';

const mockUseGlobalAccount = jest.mocked(useGlobalAccount);
const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);

const ADDRESS_MOCK = '0xabc123';

function setup(
  overrides: {
    value?: 'global-account' | 'money-account';
    onChange?: jest.Mock;
    formattedBalance?: string;
    moneyAccountBalance?: string;
  } = {},
) {
  const onChange = overrides.onChange ?? jest.fn();

  mockUseGlobalAccount.mockReturnValue({
    name: 'My Wallet',
    address: ADDRESS_MOCK,
    avatarVariant: AvatarAccountVariant.Blockies,
    formattedBalance: overrides.formattedBalance,
  });

  mockUseMoneyAccountBalance.mockReturnValue({
    totalFiatFormatted: overrides.moneyAccountBalance,
  } as ReturnType<typeof useMoneyAccountBalance>);

  return {
    onChange,
    ...render(
      <PayFromRow
        value={overrides.value ?? 'global-account'}
        onChange={onChange}
      />,
    ),
  };
}

describe('PayFromRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the From label', () => {
    const { getByText } = setup();
    expect(getByText('confirm.label.from')).toBeDefined();
  });

  it('shows the selected account name in the pill', () => {
    const { getByText } = setup();
    expect(getByText('My Wallet')).toBeDefined();
  });

  it('shows money account title in the pill when money-account is selected', () => {
    const { getByText } = setup({ value: 'money-account' });
    expect(getByText('confirm.perps_from.money_account')).toBeDefined();
  });

  it('does not show the modal initially', () => {
    const { queryByTestId } = setup();
    expect(queryByTestId('pay-from-row-modal')).toBeNull();
  });

  it('opens the modal when the pill is pressed', async () => {
    const { getByTestId } = setup();
    await act(async () => {
      fireEvent.press(getByTestId('pay-from-row-pill'));
    });
    expect(getByTestId('pay-from-row-modal')).toBeDefined();
  });

  it('renders both options in the modal', async () => {
    const { getByTestId, getAllByText, getByText } = setup();
    await act(async () => {
      fireEvent.press(getByTestId('pay-from-row-pill'));
    });
    // 'My Wallet' appears in both the pill and the modal row
    expect(getAllByText('My Wallet').length).toBeGreaterThanOrEqual(1);
    expect(getByText('confirm.perps_from.money_account')).toBeDefined();
  });

  it('marks the current source as selected in the modal', async () => {
    const { getByTestId } = setup({ value: 'global-account' });
    await act(async () => {
      fireEvent.press(getByTestId('pay-from-row-pill'));
    });
    expect(getByTestId('payment-row-global-account-selected')).toBeDefined();
  });

  it('calls onChange and closes modal when an option is pressed', async () => {
    const onChange = jest.fn();
    const { getByTestId, queryByTestId } = setup({ onChange });
    await act(async () => {
      fireEvent.press(getByTestId('pay-from-row-pill'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('payment-row-money-account'));
    });
    expect(onChange).toHaveBeenCalledWith('money-account');
    expect(queryByTestId('pay-from-row-modal')).toBeNull();
  });

  it('shows global account balance as trailing element', async () => {
    const { getByTestId } = setup({ formattedBalance: '$10.84' });
    await act(async () => {
      fireEvent.press(getByTestId('pay-from-row-pill'));
    });
    expect(getByTestId('payment-row-global-account-trailing')).toBeDefined();
  });

  it('does not show trailing element when global account balance is unavailable', async () => {
    const { getByTestId, queryByTestId } = setup({
      formattedBalance: undefined,
    });
    await act(async () => {
      fireEvent.press(getByTestId('pay-from-row-pill'));
    });
    expect(queryByTestId('payment-row-global-account-trailing')).toBeNull();
  });

  it('shows money account balance as trailing element', async () => {
    const { getByTestId } = setup({ moneyAccountBalance: '$25.00' });
    await act(async () => {
      fireEvent.press(getByTestId('pay-from-row-pill'));
    });
    expect(getByTestId('payment-row-money-account-trailing')).toBeDefined();
  });

  it('does not show money account trailing element when balance is unavailable', async () => {
    const { getByTestId, queryByTestId } = setup({
      moneyAccountBalance: undefined,
    });
    await act(async () => {
      fireEvent.press(getByTestId('pay-from-row-pill'));
    });
    expect(queryByTestId('payment-row-money-account-trailing')).toBeNull();
  });

  it('closes the modal via the header close button', async () => {
    const { getByTestId, queryByTestId } = setup();
    await act(async () => {
      fireEvent.press(getByTestId('pay-from-row-pill'));
    });
    expect(getByTestId('pay-from-row-modal')).toBeDefined();
    await act(async () => {
      fireEvent.press(getByTestId('header-close-button'));
    });
    expect(queryByTestId('pay-from-row-modal')).toBeNull();
  });
});
