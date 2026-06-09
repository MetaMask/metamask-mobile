import React from 'react';
import { Text as MockText, View as MockView } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../util/theme';
import { useUpgradeMoneyAccountOnMount } from '../hooks/useUpgradeMoneyAccountOnMount';
import {
  MoneyConfirmationScreenStack,
  MoneyModalStack,
  MoneyTabScreenStack,
} from './index';

jest.mock('../hooks/useUpgradeMoneyAccountOnMount', () => ({
  useUpgradeMoneyAccountOnMount: jest.fn(),
}));

const mockUseUpgradeMoneyAccountOnMount = jest.mocked(
  useUpgradeMoneyAccountOnMount,
);

jest.mock(
  '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations',
  () => ({
    useEmptyNavHeaderForConfirmations: jest.fn(() => ({ headerShown: false })),
  }),
);

const EXPECTED_CARD_BACKGROUND = mockTheme.colors.background.default;

const themeWithCustomBackground = {
  ...mockTheme,
  colors: {
    ...mockTheme.colors,
    background: {
      ...mockTheme.colors.background,
      default: EXPECTED_CARD_BACKGROUND,
    },
  },
};

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({
      children,
      screenOptions,
    }: {
      children: React.ReactNode;
      screenOptions?: {
        headerShown?: boolean;
        contentStyle?: { backgroundColor?: string };
      };
    }) => (
      <MockView testID="money-stack-navigator">
        <MockText testID="money-content-background-color">
          {screenOptions?.contentStyle?.backgroundColor ?? 'none'}
        </MockText>
        {screenOptions?.headerShown === false && (
          <MockText testID="money-header-hidden">header-hidden</MockText>
        )}
        {children}
      </MockView>
    ),
    Screen: ({ name }: { name: string }) => (
      <MockView testID={`money-screen-${name}`}>
        <MockText>{name}</MockText>
      </MockView>
    ),
  }),
}));

jest.mock('../Views/MoneyHomeView', () => () => (
  <MockView testID="mock-money-home-view" />
));
jest.mock('../Views/MoneyActivityView', () => () => (
  <MockView testID="mock-money-activity-view" />
));
jest.mock('../Views/MoneyHowItWorksView', () => () => (
  <MockView testID="mock-money-how-it-works-view" />
));
jest.mock('../Views/MoneyPotentialEarningsView', () => () => (
  <MockView testID="mock-money-potential-earnings-view" />
));
jest.mock('../components/MoneyAddMoneySheet', () => () => (
  <MockView testID="mock-money-add-money-sheet" />
));
jest.mock('../components/MoneyMoreSheet', () => () => (
  <MockView testID="mock-money-more-sheet" />
));
jest.mock('../components/MoneyTransferSheet', () => () => (
  <MockView testID="mock-money-transfer-sheet" />
));
jest.mock('../components/MoneyApyInfoSheet', () => () => (
  <MockView testID="mock-money-apy-info-sheet" />
));
jest.mock('../components/MoneyEarningsInfoSheet', () => () => (
  <MockView testID="mock-money-earnings-info-sheet" />
));
jest.mock('../components/MoneyBalanceInfoSheet', () => () => (
  <MockView testID="mock-money-balance-info-sheet" />
));
jest.mock('../components/MoneyLinkCardSheet', () => () => (
  <MockView testID="mock-money-link-card-sheet" />
));
jest.mock('../components/MoneyEarnCryptoInfoSheet', () => () => (
  <MockView testID="mock-money-earn-crypto-info-sheet" />
));
jest.mock('../components/MoneyTransactionDetailsSheet', () => () => (
  <MockView testID="mock-money-transaction-details-sheet" />
));
jest.mock('../../../Views/confirmations/components/confirm', () => ({
  Confirm: () => <MockView testID="mock-confirm" />,
}));

describe('MoneyTabScreenStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers Money home, activity, how-it-works, and potential-earnings screens', () => {
    const { getByTestId } = renderWithProvider(<MoneyTabScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyHome')).toBeOnTheScreen();
    expect(getByTestId('money-screen-MoneyActivity')).toBeOnTheScreen();
    expect(getByTestId('money-screen-MoneyHowItWorks')).toBeOnTheScreen();
    expect(
      getByTestId('money-screen-MoneyPotentialEarnings'),
    ).toBeOnTheScreen();
  });

  it('sets stack content background from theme to avoid flash during inner navigation', () => {
    const { getByTestId } = renderWithProvider(<MoneyTabScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-content-background-color')).toHaveTextContent(
      EXPECTED_CARD_BACKGROUND,
    );
  });

  it('hides the stack header', () => {
    const { getByTestId } = renderWithProvider(<MoneyTabScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-header-hidden')).toBeOnTheScreen();
  });

  it('calls useUpgradeMoneyAccountOnMount on mount', () => {
    renderWithProvider(<MoneyTabScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(mockUseUpgradeMoneyAccountOnMount).toHaveBeenCalledTimes(1);
  });
});

describe('MoneyConfirmationScreenStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the redesigned confirmations screen', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyConfirmationScreenStack />,
      { theme: themeWithCustomBackground },
    );

    expect(
      getByTestId('money-screen-RedesignedConfirmations'),
    ).toBeOnTheScreen();
  });

  it('hides the stack header', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyConfirmationScreenStack />,
      { theme: themeWithCustomBackground },
    );

    expect(getByTestId('money-header-hidden')).toBeOnTheScreen();
  });

  it('sets stack content background from theme', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyConfirmationScreenStack />,
      { theme: themeWithCustomBackground },
    );

    expect(getByTestId('money-content-background-color')).toHaveTextContent(
      EXPECTED_CARD_BACKGROUND,
    );
  });

  it('calls useUpgradeMoneyAccountOnMount on mount', () => {
    renderWithProvider(<MoneyConfirmationScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(mockUseUpgradeMoneyAccountOnMount).toHaveBeenCalledTimes(1);
  });
});

describe('MoneyModalStack', () => {
  it('registers the Add money sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyAddMoneySheet')).toBeOnTheScreen();
  });

  it('registers the More sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyMoreSheet')).toBeOnTheScreen();
  });

  it('registers the Transfer money sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyTransferSheet')).toBeOnTheScreen();
  });

  it('registers the APY info sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyApyInfoSheet')).toBeOnTheScreen();
  });

  it('registers the Earnings info sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(
      getByTestId('money-screen-MoneyEarningsInfoSheet'),
    ).toBeOnTheScreen();
  });

  it('registers the Money balance info sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyBalanceInfoSheet')).toBeOnTheScreen();
  });

  it('registers the Link card sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyLinkCardSheet')).toBeOnTheScreen();
  });

  it('registers the Earn crypto info sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(
      getByTestId('money-screen-MoneyEarnCryptoInfoSheet'),
    ).toBeOnTheScreen();
  });

  it('registers the Transaction details sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(
      getByTestId('money-screen-MoneyTransactionDetailsSheet'),
    ).toBeOnTheScreen();
  });
});
