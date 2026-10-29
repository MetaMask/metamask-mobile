import React from 'react';
import { Text as MockText, View as MockView } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { mockTheme } from '../../../../util/theme';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { useUpgradeMoneyAccountOnFocus } from '../hooks/useUpgradeMoneyAccountOnFocus';
import { selectMoneyEnableMoneyAccountFlag } from '../selectors/featureFlags';
import {
  MoneyConfirmationScreenStack,
  MoneyModalGateway,
  MoneyModalStack,
  MoneyTabScreenStack,
} from './index';

jest.mock('../hooks/useUpgradeMoneyAccountOnFocus', () => ({
  useUpgradeMoneyAccountOnFocus: jest.fn(),
}));

const mockUseUpgradeMoneyAccountOnFocus = jest.mocked(
  useUpgradeMoneyAccountOnFocus,
);
const mockSelectMoneyEnableMoneyAccountFlag = jest.mocked(
  selectMoneyEnableMoneyAccountFlag,
);

jest.mock('../selectors/featureFlags', () => ({
  selectMoneyEnableMoneyAccountFlag: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      fetchCardHomeData: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations',
  () => ({
    useEmptyNavHeaderForConfirmations: jest.fn(() => ({ headerShown: false })),
  }),
);

const EXPECTED_CARD_BACKGROUND = mockTheme.colors.background.default;
const mockGoBack = jest.fn();

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
    Screen: ({
      name,
      listeners,
    }: {
      name: string;
      listeners?: { focus?: () => void };
    }) => (
      <MockView testID={`money-screen-${name}`}>
        <MockText>{name}</MockText>
        {listeners?.focus && (
          <MockText
            testID={`money-screen-${name}-focus`}
            onPress={listeners.focus}
          >
            focus
          </MockText>
        )}
      </MockView>
    ),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
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
jest.mock('../../../Views/confirmations/components/confirm', () => ({
  Confirm: () => <MockView testID="mock-confirm" />,
}));
jest.mock('../components/MoneyGeoBlockSheet/MoneyGeoBlockSheet', () => () => (
  <MockView testID="mock-money-geo-block-sheet" />
));
jest.mock('../components/MoneyDeeplinkModal/MoneyDeeplinkModal', () => ({
  __esModule: true,
  default: ({
    title,
    description,
    onDismiss,
  }: {
    title?: string;
    description?: string;
    onDismiss?: () => void;
  }) => (
    <MockView testID="mock-money-deeplink-modal">
      <MockText>{title}</MockText>
      <MockText>{description}</MockText>
      <MockText testID="mock-money-deeplink-modal-close" onPress={onDismiss}>
        close
      </MockText>
    </MockView>
  ),
}));

describe('MoneyTabScreenStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers Money home, activity, and how-it-works screens', () => {
    const { getByTestId } = renderWithProvider(<MoneyTabScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyHome')).toBeOnTheScreen();
    expect(getByTestId('money-screen-MoneyActivity')).toBeOnTheScreen();
    expect(getByTestId('money-screen-MoneyHowItWorks')).toBeOnTheScreen();
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

  it('calls useUpgradeMoneyAccountOnFocus', () => {
    renderWithProvider(<MoneyTabScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(mockUseUpgradeMoneyAccountOnFocus).toHaveBeenCalledTimes(1);
  });

  it('prefetches card home data when Money home receives focus', () => {
    const { getByTestId } = renderWithProvider(<MoneyTabScreenStack />, {
      theme: themeWithCustomBackground,
    });

    fireEvent.press(getByTestId(`money-screen-${Routes.MONEY.HOME}-focus`));

    expect(
      Engine.context.CardController.fetchCardHomeData,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.CardController.fetchCardHomeData,
    ).toHaveBeenCalledWith();
  });

  it('does not attach card prefetch listeners to other Money routes', () => {
    const { queryByTestId } = renderWithProvider(<MoneyTabScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(
      queryByTestId(`money-screen-${Routes.MONEY.ACTIVITY}-focus`),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(`money-screen-${Routes.MONEY.HOW_IT_WORKS}-focus`),
    ).not.toBeOnTheScreen();
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

  it('calls useUpgradeMoneyAccountOnFocus', () => {
    renderWithProvider(<MoneyConfirmationScreenStack />, {
      theme: themeWithCustomBackground,
    });

    expect(mockUseUpgradeMoneyAccountOnFocus).toHaveBeenCalledTimes(1);
  });
});

describe('MoneyModalStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useUpgradeMoneyAccountOnFocus', () => {
    renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(mockUseUpgradeMoneyAccountOnFocus).toHaveBeenCalledTimes(1);
  });

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

  it('registers the Geo block sheet as a modal screen', () => {
    const { getByTestId } = renderWithProvider(<MoneyModalStack />, {
      theme: themeWithCustomBackground,
    });

    expect(getByTestId('money-screen-MoneyGeoBlockSheet')).toBeOnTheScreen();
  });
});

describe('MoneyModalGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the disabled notice without mounting the modal stack when the feature is disabled', () => {
    mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(false);

    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <MoneyModalGateway />,
      { theme: themeWithCustomBackground },
    );

    expect(getByTestId('mock-money-deeplink-modal')).toBeOnTheScreen();
    expect(
      getByText(strings('money.deeplink_modal.money_account_disabled.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.deeplink_modal.money_account_disabled.description'),
      ),
    ).toBeOnTheScreen();
    expect(queryByTestId('money-stack-navigator')).not.toBeOnTheScreen();
    expect(mockUseUpgradeMoneyAccountOnFocus).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('mock-money-deeplink-modal-close'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('mounts the modal stack when the feature is enabled', () => {
    mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyModalGateway />,
      { theme: themeWithCustomBackground },
    );

    expect(getByTestId('money-stack-navigator')).toBeOnTheScreen();
    expect(queryByTestId('mock-money-deeplink-modal')).not.toBeOnTheScreen();
    expect(mockUseUpgradeMoneyAccountOnFocus).toHaveBeenCalledTimes(1);
  });
});
