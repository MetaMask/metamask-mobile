import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ImmersveFundingApproval from './ImmersveFundingApproval';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import Engine from '../../../../../core/Engine';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import { useImmersveFunding } from '../../hooks/useImmersveFunding';
import { useImmersveOnboardingRouter } from '../../hooks/useImmersveOnboardingRouter';
import type { ImmersveNextAction } from '../../util/immersvePrerequisites';
import { selectCardImmersveCountryFunding } from '../../../../../selectors/featureFlagController/card';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../util/networks');

jest.mock('../../../../../core/redux/slices/card', () => ({
  selectImmersveFundingSourceId: 'select-funding-source-id',
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: 'select-account-by-scope',
}));

jest.mock('../../../../../selectors/cardController', () => ({
  selectCardHomeData: 'select-card-home-data',
  selectCardSelectedCountry: 'select-card-selected-country',
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  getMemoizedInternalAccountByAddress: jest.fn(
    (_state: unknown, address: string) => ({
      address,
      id: `id-${address}`,
      metadata: { name: 'Funding Account' },
    }),
  ),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: 'select-account-to-group-map',
  }),
);

jest.mock('../../../../../selectors/settings', () => ({
  selectAvatarAccountType: 'select-avatar-account-type',
}));

jest.mock('../../../../hooks/multichainAccounts/useAccountGroupName', () => ({
  useAccountGroupName: jest.fn(() => null),
}));

const NZ_FUNDING_CHANNEL = {
  source: 'moneyAccount' as const,
  fundingChannelId: 'd32fbc3527bc048e7de9e9fdc68c1966',
  spenderAddress: '0xBcD8FAeD3A67d72Ac7697D227582A6198B968964',
  network: 'monad-mainnet',
  caipChainId: 'eip155:143',
  tokenAddress: '0x1C8a336051D2024E318A229d01F9F6CF96efD316',
  decimals: 6,
};

const MOCK_ACCOUNT = {
  address: '0xAccount',
  metadata: { name: 'Account 1' },
};
const mockSelectAccountByScope = jest.fn(
  (): typeof MOCK_ACCOUNT | undefined => MOCK_ACCOUNT,
);

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: unknown) => {
    switch (selector) {
      case 'select-funding-source-id':
        return 'fs-1';
      case 'select-account-by-scope':
        return mockSelectAccountByScope;
      case 'select-avatar-account-type':
        return 'default';
      case 'select-card-home-data':
        return null;
      case 'select-account-to-group-map':
        return {};
      default:
        return undefined;
    }
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(() => ({ countryKey: 'GB' })),
}));

const mockMarkMigrationCompleted = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    CardController: {
      fetchCardHomeData: jest.fn().mockResolvedValue(undefined),
      markMigrationCompleted: (...args: unknown[]) =>
        mockMarkMigrationCompleted(...args),
    },
  },
}));

jest.mock('../../hooks/useCardHeaderHandlers', () => ({
  useCardHeaderHandlers: jest.fn(() => ({})),
}));

jest.mock('../../hooks/useImmersveSpendingPrerequisites', () => ({
  useImmersveSpendingPrerequisites: jest.fn(),
}));
const mockConfirmLinkInBackground = jest.fn().mockResolvedValue(true);
jest.mock('../../hooks/useMoneyAccountCardLinkage', () => ({
  useMoneyAccountCardLinkage: () => ({
    confirmLinkInBackground: mockConfirmLinkInBackground,
    isLinking: false,
  }),
}));

jest.mock('../../hooks/useImmersveFunding', () => ({
  useImmersveFunding: jest.fn(),
}));
jest.mock('../../hooks/useImmersveOnboardingRouter', () => ({
  useImmersveOnboardingRouter: jest.fn(),
}));

const mockRefresh = jest.fn().mockResolvedValue(null);
const mockRoute = jest.fn();
const mockExecuteFunding = jest.fn();
const mockCreateCard = jest.fn();
const mockBuildApproveWrite = jest.fn();
const mockFetchCardHomeData = Engine.context.CardController
  .fetchCardHomeData as jest.Mock;

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
  }),
}));

jest.mock('../../util/metrics', () => ({
  CardScreens: { FUNDING_APPROVAL: 'FUNDING_APPROVAL' },
  CardEntryPoint: {
    SIGN_UP: 'SIGN_UP',
    CARD_HOME_MONEY_ACCOUNT_CARD: 'CARD_HOME_MONEY_ACCOUNT_CARD',
  },
  CardActions: {
    FUNDING_APPROVAL_CONFIRM: 'FUNDING_APPROVAL_CONFIRM',
    FUNDING_APPROVAL_RETRY: 'FUNDING_APPROVAL_RETRY',
  },
  withCardProvider: (
    provider: string | null | undefined,
    properties: Record<string, unknown> = {},
  ) => ({
    provider,
    ...properties,
  }),
}));

const mockOnboardingStepHeaderMode = jest.fn();
jest.mock('./OnboardingStep', () => {
  const { mockRenderFooterButtons } = jest.requireActual(
    './testUtils/mockOnboardingStepFooter',
  );
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return ({
    title,
    description,
    formFields,
    headerMode,
    ...footerProps
  }: {
    title: string;
    description: string;
    formFields: React.ReactNode;
    headerMode?: string;
    primaryButtonProps?: Record<string, unknown>;
    secondaryButtonProps?: Record<string, unknown>;
    tertiaryButtonProps?: Record<string, unknown>;
  }) => {
    mockOnboardingStepHeaderMode(headerMode);
    return React.createElement(
      View,
      { testID: 'onboarding-step' },
      React.createElement(Text, { testID: 'onboarding-step-title' }, title),
      React.createElement(
        Text,
        { testID: 'onboarding-step-description' },
        description,
      ),
      React.createElement(
        View,
        { testID: 'onboarding-step-form-fields' },
        formFields,
      ),
      React.createElement(
        View,
        { testID: 'onboarding-step-actions' },
        mockRenderFooterButtons(footerProps),
      ),
    );
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    // The glass header's ButtonIconGlass reads this enum at module load.
    ButtonIconSize: jest.requireActual('@metamask/design-system-react-native')
      .ButtonIconSize,
    Box: ({ children, ...p }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(View, p, children),
    Text: ({ children, ...p }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(Text, p, children),
    Button: ({
      children,
      onPress,
      testID,
      isDisabled,
      isLoading,
    }: React.PropsWithChildren<{
      onPress?: () => void;
      testID?: string;
      isDisabled?: boolean;
      isLoading?: boolean;
    }>) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID,
          disabled: isDisabled,
          accessibilityState: { disabled: isDisabled, busy: isLoading },
        },
        children,
      ),
    Card: ({ children, ...p }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(View, p, children),
    KeyValueRow: ({
      keyLabel,
      value,
      valueStartAccessory,
      ...p
    }: {
      keyLabel: React.ReactNode;
      value: React.ReactNode;
      valueStartAccessory?: React.ReactNode;
    }) =>
      ReactActual.createElement(
        View,
        p,
        ReactActual.createElement(Text, null, keyLabel),
        valueStartAccessory ?? null,
        ReactActual.createElement(Text, null, value),
      ),
    HelpText: ({ children, ...p }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(Text, p, children),
    HelpTextSeverity: { Danger: 'danger' },
    TextColor: { TextAlternative: 'TextAlternative' },
    AvatarAccount: () => null,
    AvatarToken: () => null,
    BadgeWrapper: ({ children }: React.PropsWithChildren<object>) => children,
    BadgeNetwork: () => null,
    HeaderStandard: () => null,
    Icon: () => null,
    Spinner: (p: object) => ReactActual.createElement(View, p),
    AvatarAccountVariant: {
      Jazzicon: 'Jazzicon',
      Blockies: 'Blockies',
      Maskicon: 'Maskicon',
    },
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Lg: 'Lg', Md: 'Md' },
    TextVariant: { BodyMd: 'BodyMd', HeadingLg: 'HeadingLg' },
    AvatarBaseSize: { Sm: 'Sm' },
    BadgeWrapperPosition: { BottomRight: 'BottomRight' },
    IconName: { Danger: 'Danger' },
    IconSize: { Xl: 'Xl' },
    IconColor: { ErrorDefault: 'ErrorDefault' },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockReset = jest.fn();

const WRITE = {
  abi: [],
  contractAddress: '0xToken',
  method: 'approve',
  params: { _spender: '0xSpender', _value: '1' },
};

const setNextAction = (
  nextAction: ImmersveNextAction | null,
  error: string | null = null,
  isLoading = false,
) => {
  (useImmersveSpendingPrerequisites as jest.Mock).mockReturnValue({
    nextAction,
    refresh: mockRefresh,
    prerequisites: [],
    isLoading,
    error,
  });
};

const setFundingState = (isLoading = false, error: string | null = null) => {
  (useImmersveFunding as jest.Mock).mockReturnValue({
    executeFunding: mockExecuteFunding,
    createCard: mockCreateCard,
    buildApproveWrite: mockBuildApproveWrite,
    createFundingSource: jest.fn(),
    isLoading,
    error,
  });
};

describe('ImmersveFundingApproval', () => {
  const mockUseSelectorImplementation = (selector: unknown) => {
    switch (selector) {
      case 'select-funding-source-id':
        return 'fs-1';
      case 'select-account-by-scope':
        return mockSelectAccountByScope;
      case 'select-avatar-account-type':
        return 'default';
      case 'select-card-home-data':
        return null;
      case 'select-account-to-group-map':
        return {};
      case 'select-card-selected-country':
        return null;
      case selectCardImmersveCountryFunding:
        return {};
      default:
        return undefined;
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation(mockUseSelectorImplementation);
    (useParams as jest.Mock).mockReturnValue({ countryKey: 'GB' });
    (useNavigation as jest.Mock).mockReturnValue({
      reset: mockReset,
    });
    (useImmersveOnboardingRouter as jest.Mock).mockReturnValue(mockRoute);
    mockSelectAccountByScope.mockReset();
    mockSelectAccountByScope.mockReturnValue(MOCK_ACCOUNT);
    mockExecuteFunding.mockResolvedValue('0xtxhash');
    mockCreateCard.mockResolvedValue({ cardId: 'card-1' });
    mockMarkMigrationCompleted.mockResolvedValue(undefined);
    mockBuildApproveWrite.mockReturnValue(WRITE);
    mockFetchCardHomeData.mockResolvedValue(undefined);
    setFundingState();
    setNextAction(null);
  });

  it('polls once on mount and shows the loading spinner before a nextAction resolves', () => {
    setNextAction(null, null, true);
    const { getByTestId } = render(<ImmersveFundingApproval />);
    expect(mockRefresh).toHaveBeenCalled();
    expect(getByTestId('immersve-funding-approval-spinner')).toBeTruthy();
    // The loading state keeps the step frame and a pinned, loading CTA.
    expect(mockOnboardingStepHeaderMode).toHaveBeenCalledWith('close-direct');
    const button = getByTestId('immersve-funding-approval-confirm-button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('shows a full-screen error with retry when the first poll fails', () => {
    setNextAction(null, 'Something went wrong');
    const { getByTestId } = render(<ImmersveFundingApproval />);

    const errorText = getByTestId('immersve-funding-approval-error');
    expect(errorText).toHaveTextContent('Something went wrong');
    expect(errorText).toHaveProp('accessibilityRole', 'alert');
    expect(mockOnboardingStepHeaderMode).toHaveBeenCalledWith('close-direct');

    fireEvent.press(getByTestId('immersve-funding-approval-retry-button'));
    expect(mockRefresh).toHaveBeenCalledTimes(2); // mount + retry
  });

  it('hides the token row and uses Money account copy for NZ', () => {
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectCardImmersveCountryFunding) {
        return { NZ: NZ_FUNDING_CHANNEL };
      }
      return mockUseSelectorImplementation(selector);
    });
    (useParams as jest.Mock).mockReturnValue({ countryKey: 'NZ' });
    setNextAction({ type: 'funding', write: WRITE });
    const { getByText, getByTestId, queryByTestId } = render(
      <ImmersveFundingApproval />,
    );

    expect(
      getByText(
        'card.card_onboarding.immersve_funding_approval.money_account_description',
      ),
    ).toBeTruthy();
    expect(getByTestId('immersve-funding-approval-account-row')).toBeTruthy();
    expect(queryByTestId('immersve-funding-approval-token-row')).toBeNull();
  });

  describe('Money account approve', () => {
    const useMoneyAccountCountry = (mode?: 'reapprove') => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === selectCardImmersveCountryFunding) {
          return { NZ: NZ_FUNDING_CHANNEL };
        }
        return mockUseSelectorImplementation(selector);
      });
      (useParams as jest.Mock).mockReturnValue({
        countryKey: 'NZ',
        ...(mode ? { mode } : {}),
      });
    };

    it('refreshes prerequisites after a Money account link during onboarding', async () => {
      useMoneyAccountCountry();
      setNextAction({ type: 'funding', write: WRITE });
      const { getByTestId } = render(<ImmersveFundingApproval />);
      mockRefresh.mockClear();

      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

      await waitFor(() => {
        expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
          delegationAmountHuman: '2199023255551',
          entrypoint: 'SIGN_UP',
          showSuccessToast: false,
        });
        expect(mockRefresh).toHaveBeenCalled();
      });
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockExecuteFunding).not.toHaveBeenCalled();
    });

    it('fetches home data and returns to Card Home after a Money account reapprove', async () => {
      useMoneyAccountCountry('reapprove');
      const { getByTestId } = render(<ImmersveFundingApproval />);

      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

      await waitFor(() => {
        expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
          delegationAmountHuman: '2199023255551',
          entrypoint: 'CARD_HOME_MONEY_ACCOUNT_CARD',
          showSuccessToast: true,
        });
        expect(mockFetchCardHomeData).toHaveBeenCalledWith({ force: true });
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      });
    });

    it('stops settling when the Money account link is not completed', async () => {
      useMoneyAccountCountry();
      setNextAction({ type: 'funding', write: WRITE });
      mockConfirmLinkInBackground.mockResolvedValueOnce(false);
      const { getByTestId } = render(<ImmersveFundingApproval />);

      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

      await waitFor(() => {
        expect(
          getByTestId('immersve-funding-approval-confirm-button').props
            .accessibilityState.disabled,
        ).toBeFalsy();
      });
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('stops settling when the Money account link rejects', async () => {
      useMoneyAccountCountry();
      setNextAction({ type: 'funding', write: WRITE });
      mockConfirmLinkInBackground.mockRejectedValueOnce(
        new Error('link failed'),
      );
      const { getByTestId } = render(<ImmersveFundingApproval />);

      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

      await waitFor(() => {
        expect(
          getByTestId('immersve-funding-approval-confirm-button').props
            .accessibilityState.disabled,
        ).toBeFalsy();
      });
      expect(mockReset).not.toHaveBeenCalled();
    });
  });

  it('renders the settings card and an enabled confirm button once funding is known', () => {
    setNextAction({ type: 'funding', write: WRITE });
    const { getByTestId } = render(<ImmersveFundingApproval />);

    expect(mockOnboardingStepHeaderMode).toHaveBeenCalledWith('close-direct');
    expect(getByTestId('immersve-funding-approval-account-row')).toBeTruthy();
    expect(getByTestId('immersve-funding-approval-token-row')).toBeTruthy();
    const button = getByTestId('immersve-funding-approval-confirm-button');
    expect(button.props.accessibilityState.disabled).toBeFalsy();
  });

  it('does not poll in the background while sitting idle on funding (no flicker)', () => {
    jest.useFakeTimers();
    setNextAction({ type: 'funding', write: WRITE });
    render(<ImmersveFundingApproval />);
    expect(mockRefresh).toHaveBeenCalledTimes(1); // mount only

    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('keeps the settings card mounted and disables the button while approving (no full-screen swap)', async () => {
    setNextAction({ type: 'funding', write: WRITE });
    const { getByTestId } = render(<ImmersveFundingApproval />);

    fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

    expect(mockExecuteFunding).toHaveBeenCalledWith(WRITE, '2199023255551');
    // Settling flips synchronously on press — the card stays mounted, only the
    // button's own state changes.
    expect(getByTestId('immersve-funding-approval-account-row')).toBeTruthy();
    expect(
      getByTestId('immersve-funding-approval-confirm-button').props
        .accessibilityState.disabled,
    ).toBe(true);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(2)); // mount + post-approve
  });

  it('locally polls for settlement after approving, and stops once active', async () => {
    jest.useFakeTimers();
    setNextAction({ type: 'funding', write: WRITE });
    const { getByTestId, rerender } = render(<ImmersveFundingApproval />);

    await act(async () => {
      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockRefresh).toHaveBeenCalledTimes(2); // mount + post-approve

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(mockRefresh).toHaveBeenCalledTimes(3); // still 'funding' — settling poll fired

    setNextAction({ type: 'active' });
    rerender(<ImmersveFundingApproval />);

    await act(async () => {
      jest.advanceTimersByTime(20000);
      await Promise.resolve();
    });
    // Settled to active — the local poll must have stopped.
    expect(mockRefresh).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  it('creates the card once nextAction becomes active, then resets to Card Home', async () => {
    setNextAction({ type: 'active' });
    render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockCreateCard).toHaveBeenCalledWith('fs-1');
      expect(mockMarkMigrationCompleted).toHaveBeenCalledTimes(1);
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    });
  });

  it('skips createCard and resets to Card Home when a card already exists', async () => {
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === 'select-card-home-data') {
        return { card: { id: 'existing-card' } };
      }
      return mockUseSelectorImplementation(selector);
    });
    setNextAction({ type: 'active' });
    render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    });
    expect(mockCreateCard).not.toHaveBeenCalled();
    expect(mockMarkMigrationCompleted).toHaveBeenCalledTimes(1);
  });

  it('treats a Conflict from createCard as an existing card and goes to Card Home', async () => {
    mockCreateCard.mockRejectedValue(
      new CardProviderError(
        CardProviderErrorCode.Conflict,
        'Conflict on createCard',
        409,
      ),
    );
    setNextAction({ type: 'active' });
    render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockFetchCardHomeData).toHaveBeenCalledWith({ force: true });
      expect(mockMarkMigrationCompleted).toHaveBeenCalledTimes(1);
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    });
    expect(mockCreateCard).toHaveBeenCalledTimes(1);
  });

  it('shows the funding account group when it is not the selected account', () => {
    const fundingAddress = '0xOther';
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === 'select-account-to-group-map') {
        return {
          [`id-${fundingAddress}`]: { metadata: { name: 'Savings Group' } },
        };
      }
      // The funding-account lookup is an inline selector. Known selectors are
      // module functions and stay on the shared mock.
      if (typeof selector === 'function' && selector.name === '') {
        return selector({});
      }
      return mockUseSelectorImplementation(selector);
    });
    (useParams as jest.Mock).mockReturnValue({
      countryKey: 'GB',
      fundingAddress,
    });
    setNextAction({ type: 'funding', write: WRITE });

    const { getByText } = render(<ImmersveFundingApproval />);

    expect(getByText('Savings Group')).toBeTruthy();
  });

  it('renders the account row without a name when no account is selected', () => {
    mockSelectAccountByScope.mockReturnValue(undefined);
    setNextAction({ type: 'funding', write: WRITE });

    const { getByTestId, queryByText } = render(<ImmersveFundingApproval />);

    expect(getByTestId('immersve-funding-approval-account-row')).toBeTruthy();
    expect(queryByText('Account 1')).toBeNull();
    expect(queryByText('Funding Account')).toBeNull();
  });

  it('uses the selected country when the route has no country', () => {
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectCardImmersveCountryFunding) {
        return { NZ: NZ_FUNDING_CHANNEL };
      }
      if (selector === 'select-card-selected-country') {
        return 'NZ';
      }
      return mockUseSelectorImplementation(selector);
    });
    (useParams as jest.Mock).mockReturnValue({});
    setNextAction({ type: 'funding', write: WRITE });

    const { getByText, queryByTestId } = render(<ImmersveFundingApproval />);

    expect(
      getByText(
        'card.card_onboarding.immersve_funding_approval.money_account_description',
      ),
    ).toBeTruthy();
    expect(queryByTestId('immersve-funding-approval-token-row')).toBeNull();
  });

  it('resets to Card Home when marking the migration complete fails', async () => {
    mockMarkMigrationCompleted.mockRejectedValue(new Error('migration failed'));
    setNextAction({ type: 'active' });
    render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    });
  });

  it('stays on the screen when createCard fails for a reason other than Conflict', async () => {
    mockCreateCard.mockRejectedValue(new Error('create failed'));
    setNextAction({ type: 'active' });
    const { rerender } = render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockCreateCard).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    setNextAction({ type: 'funding', write: WRITE });
    rerender(<ImmersveFundingApproval />);
    setNextAction({ type: 'active' });
    rerender(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockCreateCard).toHaveBeenCalledTimes(2);
    });
    expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('goes to Card Home when the card already exists even if the refetch fails', async () => {
    mockCreateCard.mockRejectedValue(
      new CardProviderError(
        CardProviderErrorCode.Conflict,
        'Conflict on createCard',
        409,
      ),
    );
    mockFetchCardHomeData.mockRejectedValueOnce(new Error('refetch failed'));
    setNextAction({ type: 'active' });
    render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockFetchCardHomeData).toHaveBeenCalledWith({ force: true });
      expect(mockMarkMigrationCompleted).toHaveBeenCalledTimes(1);
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    });
  });

  it('does not re-create the card on re-render while still active', async () => {
    setNextAction({ type: 'active' });
    const { rerender } = render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockCreateCard).toHaveBeenCalledTimes(1);
    });

    rerender(<ImmersveFundingApproval />);
    expect(mockCreateCard).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error and re-enables the button to retry when executeFunding fails', () => {
    setNextAction({ type: 'funding', write: WRITE });
    setFundingState(false, 'Approval failed');
    const { getByTestId } = render(<ImmersveFundingApproval />);

    expect(getByTestId('immersve-funding-approval-error').props.children).toBe(
      'Approval failed',
    );
    const retryButton = getByTestId('immersve-funding-approval-retry-button');
    expect(retryButton.props.accessibilityState.disabled).toBeFalsy();

    fireEvent.press(retryButton);
    expect(mockExecuteFunding).toHaveBeenCalledWith(WRITE, '2199023255551');
  });

  it('shows an inline error and retries createCard when it fails', () => {
    setNextAction({ type: 'active' });
    setFundingState(false, 'Card creation failed');
    const { getByTestId } = render(<ImmersveFundingApproval />);

    const retryButton = getByTestId('immersve-funding-approval-retry-button');
    fireEvent.press(retryButton);
    expect(mockCreateCard).toHaveBeenCalledWith('fs-1');
  });

  it('delegates unexpected next actions to the shared router', () => {
    const action: ImmersveNextAction = { type: 'rejected', canRetry: false };
    setNextAction(action);
    render(<ImmersveFundingApproval />);

    expect(mockRoute).toHaveBeenCalledWith(action, { countryKey: 'GB' });
    expect(mockCreateCard).not.toHaveBeenCalled();
  });

  describe('reapprove mode', () => {
    beforeEach(() => {
      (useParams as jest.Mock).mockReturnValue({
        countryKey: 'GB',
        mode: 'reapprove',
      });
    });

    it('renders reapprove copy and skips prerequisite polling', () => {
      const { getByText, getByTestId } = render(<ImmersveFundingApproval />);

      expect(mockRefresh).not.toHaveBeenCalled();
      expect(mockOnboardingStepHeaderMode).toHaveBeenCalledWith('back');
      expect(
        getByText(
          'card.card_onboarding.immersve_funding_approval.reapprove.title',
        ),
      ).toBeTruthy();
      expect(
        getByText(
          'card.card_onboarding.immersve_funding_approval.reapprove.description',
        ),
      ).toBeTruthy();
      expect(
        getByTestId('immersve-funding-approval-confirm-button'),
      ).toBeTruthy();
    });

    it('builds a local approve, submits it, refetches home data, and resets to Card Home', async () => {
      (useParams as jest.Mock).mockReturnValue({
        countryKey: 'GB',
        mode: 'reapprove',
        fundingAddress: '0xFunding',
      });
      const { getByTestId } = render(<ImmersveFundingApproval />);

      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

      expect(useImmersveFunding).toHaveBeenCalledWith({
        fundingAddress: '0xFunding',
        country: 'GB',
      });
      expect(mockBuildApproveWrite).toHaveBeenCalledWith('2199023255551');
      expect(mockExecuteFunding).toHaveBeenCalledWith(WRITE, '2199023255551');
      expect(mockCreateCard).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(mockFetchCardHomeData).toHaveBeenCalledWith({ force: true });
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      });
    });

    it('resets to Card Home when refetch fails after reapprove', async () => {
      mockFetchCardHomeData.mockRejectedValueOnce(new Error('refetch failed'));

      const { getByTestId } = render(<ImmersveFundingApproval />);

      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      });
    });

    it('does not create a card when prerequisites report active', () => {
      setNextAction({ type: 'active' });
      render(<ImmersveFundingApproval />);

      expect(mockCreateCard).not.toHaveBeenCalled();
      expect(mockRoute).not.toHaveBeenCalled();
    });
  });
});
