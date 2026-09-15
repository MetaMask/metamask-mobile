import React from 'react';
import { Provider } from 'react-redux';
import { measureRenders } from 'reassure';
import configureStore from '../../../../../util/test/configureStore';
import initialRootState from '../../../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../../../util/theme';
import type { AssetType } from '../../../../Views/confirmations/types/token';
import MoneyPotentialEarningsView from './MoneyPotentialEarningsView';

// The scaling axis for this screen is eligible token count, not account count:
// every row is built up-front because the list is not virtualised.
const SMALL_TOKEN_COUNT = 5;
const LARGE_TOKEN_COUNT = 60;

const CHAIN_IDS = ['0x1', '0xa4b1', '0x2105', '0x38', '0xe708'];

const buildTokens = (count: number): AssetType[] =>
  Array.from({ length: count }, (_value, index) => {
    const balance = 5000 - index * 50;
    return {
      name: `Stablecoin ${index + 1}`,
      symbol: `STBL${index + 1}`,
      address: `0x${(index + 1).toString(16).padStart(40, '0')}`,
      chainId: CHAIN_IDS[index % CHAIN_IDS.length],
      decimals: 6,
      balanceInSelectedCurrency: `$${balance}.00`,
      fiat: { balance, currency: 'usd' },
    } as unknown as AssetType;
  });

let mockTokens: AssetType[] = [];

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
}));

jest.mock('../../hooks/useMoneyDepositTokens', () => ({
  useMoneyDepositTokens: () => ({
    tokens: mockTokens,
    isNoFeeToken: () => true,
  }),
}));

jest.mock('../../hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: () => ({ apyDecimal: 0.04, apyPercent: 4 }),
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: () => ({
    initiateDeposit: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: () => ({
    trackScreenViewed: jest.fn(),
    trackTokenButtonClicked: jest.fn(),
    trackTokenSurfaceClicked: jest.fn(),
    trackTooltipClicked: jest.fn(),
  }),
}));

// FlashList measures its viewport natively, which reports zero under Jest and
// would make it render every row — masking the windowing this screen relies on.
// Mirrors @shopify/flash-list's own jestSetup: a 400x900 viewport with 100px
// rows, i.e. roughly one screenful. Scoped to this file so the unit suite keeps
// asserting that every eligible token is reachable.
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => ({
  ...jest.requireActual(
    '@shopify/flash-list/dist/recyclerview/utils/measureLayout',
  ),
  measureParentSize: () => ({ x: 0, y: 0, width: 400, height: 900 }),
  measureFirstChildLayout: () => ({ x: 0, y: 0, width: 400, height: 900 }),
  measureItemLayout: () => ({ x: 0, y: 0, width: 100, height: 100 }),
}));

// Native-backed leaves inside each row. Mocked to keep the measurement on the
// list itself rather than on RN internals these rows only pass through.
jest.mock(
  '../../../../UI/Assets/components/AssetLogo/AssetLogo',
  () => 'AssetLogo',
);
jest.mock('../../../../UI/AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: () => null,
}));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');

const store = configureStore(initialRootState);

const ProvidersWrapper = ({ children }: { children: React.ReactElement }) => (
  <Provider store={store}>
    <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
  </Provider>
);

test(`MoneyPotentialEarningsView mount performance with ${SMALL_TOKEN_COUNT} eligible tokens`, async () => {
  mockTokens = buildTokens(SMALL_TOKEN_COUNT);

  await measureRenders(<MoneyPotentialEarningsView />, {
    wrapper: ProvidersWrapper,
  });
});

test(`MoneyPotentialEarningsView mount performance with ${LARGE_TOKEN_COUNT} eligible tokens`, async () => {
  mockTokens = buildTokens(LARGE_TOKEN_COUNT);

  await measureRenders(<MoneyPotentialEarningsView />, {
    wrapper: ProvidersWrapper,
  });
});
