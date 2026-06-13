import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Logger from '../../../../../util/Logger';
import { useSelector } from 'react-redux';
import MoneyConvertStablecoins from './MoneyConvertStablecoins';
import { MoneyConvertStablecoinsTestIds } from './MoneyConvertStablecoins.testIds';
import { strings } from '../../../../../../locales/i18n';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { MusdConversionAssetRowTestIds } from '../../../Earn/components/Musd/MusdConversionAssetRow';
import {
  selectHasUnapprovedMusdConversion,
  selectHasInFlightMusdConversion,
  selectMusdConversionStatuses,
} from '../../../Earn/selectors/musdConversionStatus';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events/musdEvents';
import { MONEY_HUB_EVENTS_CONSTANTS } from '../../constants/moneyHubEvents';

const { EVENT_LOCATIONS: MUSD_EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;
const { EVENT_LOCATIONS: MONEY_EVENT_LOCATIONS } = MONEY_HUB_EVENTS_CONSTANTS;

const TEST_LOCATION = MONEY_EVENT_LOCATIONS.MONEY_HUB;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

const mockUseMusdConversionTokens = jest.fn();
const mockInitiateMaxConversion = jest.fn();
const mockInitiateCustomConversion = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn(() => ({ event: 'built' }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

mockAddProperties.mockReturnValue({
  build: mockBuild,
});

jest.mock('../../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => mockUseMusdConversionTokens(),
}));

jest.mock('../../../Earn/hooks/useMusdConversion', () => ({
  useMusdConversion: () => ({
    initiateMaxConversion: mockInitiateMaxConversion,
    initiateCustomConversion: mockInitiateCustomConversion,
  }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../Earn/utils/network', () => ({
  getNetworkName: jest.fn(() => 'Ethereum Mainnet'),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockLoggerError = Logger.error as jest.Mock;

const mockUseTheme = jest.fn(() => ({ themeAppearance: 'light' }));

jest.mock('../../../../../util/theme', () => ({
  ...jest.requireActual('../../../../../util/theme'),
  useTheme: () => mockUseTheme(),
}));

jest.mock('../../../../../component-library/base-components/TagBase', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock(
  '../../../../../component-library/components/Avatars/AvatarGroup',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => <View testID="avatar-group" />,
    };
  },
);

jest.mock('../../../Earn/components/Musd/MusdConversionAssetRow', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  const MockMusdConversionAssetRow = ({
    token,
    onMaxPress,
    onEditPress,
  }: {
    token: { symbol: string };
    onMaxPress: (t: unknown) => void;
    onEditPress: (t: unknown) => void;
  }) => (
    <TouchableOpacity testID="musd-conversion-asset-row-container">
      <Text testID="musd-conversion-asset-row-token-name">{token.symbol}</Text>
      <TouchableOpacity
        testID="musd-conversion-asset-row-max-button"
        onPress={() => onMaxPress(token)}
      />
      <TouchableOpacity
        testID="musd-conversion-asset-row-edit-button"
        onPress={() => onEditPress(token)}
      />
    </TouchableOpacity>
  );
  MockMusdConversionAssetRow.displayName = 'MusdConversionAssetRow';
  return {
    __esModule: true,
    default: MockMusdConversionAssetRow,
    MusdConversionAssetRowTestIds: {
      CONTAINER: 'musd-conversion-asset-row-container',
      TOKEN_NAME: 'musd-conversion-asset-row-token-name',
      MAX_BUTTON: 'musd-conversion-asset-row-max-button',
      EDIT_BUTTON: 'musd-conversion-asset-row-edit-button',
    },
  };
});

const MOCK_USDC: AssetType = {
  name: 'USD Coin',
  symbol: 'USDC',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  balanceInSelectedCurrency: '$5,000.00',
} as AssetType;

const MOCK_USDT: AssetType = {
  name: 'Tether',
  symbol: 'USDT',
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: '0x1',
  decimals: 6,
  balanceInSelectedCurrency: '$4,000.00',
} as AssetType;

const MOCK_DAI: AssetType = {
  name: 'Dai',
  symbol: 'DAI',
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: '0x1',
  decimals: 18,
  balanceInSelectedCurrency: '$1,000.00',
} as AssetType;

const MOCK_AUSDC: AssetType = {
  name: 'Aave USDC',
  symbol: 'aUSDC',
  address: '0x98c23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
  chainId: '0x1',
  decimals: 6,
  balanceInSelectedCurrency: '$1,500.00',
} as AssetType;

const MOCK_AUSDT: AssetType = {
  name: 'Aave USDT',
  symbol: 'aUSDT',
  address: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a',
  chainId: '0x1',
  decimals: 6,
  balanceInSelectedCurrency: '$2,500.00',
} as AssetType;

const MOCK_ADAI: AssetType = {
  name: 'Aave DAI',
  symbol: 'aDAI',
  address: '0x018008bfb33d285247A21d44E50697654f754e63',
  chainId: '0x1',
  decimals: 18,
  balanceInSelectedCurrency: '$3,500.00',
} as AssetType;

const mockTokens: AssetType[] = [MOCK_USDC, MOCK_USDT, MOCK_DAI];
const mockATokens: AssetType[] = [MOCK_AUSDC, MOCK_AUSDT, MOCK_ADAI];

describe('MoneyConvertStablecoins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({ themeAppearance: 'light' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockBuild.mockReturnValue({ event: 'built' });
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectHasUnapprovedMusdConversion) return false;
      if (selector === selectHasInFlightMusdConversion) return false;
      if (selector === selectMusdConversionStatuses) return {};
      return undefined;
    });
    mockUseMusdConversionTokens.mockReturnValue({ tokens: mockTokens });
  });

  describe('with eligible tokens', () => {
    it('renders the container', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the convert title', () => {
      const { getByText } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByText(strings('money.convert_stablecoins.title')),
      ).toBeOnTheScreen();
      expect(getByText('Convert to mUSD')).toBeOnTheScreen();
    });

    it('renders the description with bonus text', () => {
      const { getByTestId, getByText } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      const description = getByTestId(
        MoneyConvertStablecoinsTestIds.DESCRIPTION,
      );
      expect(description).toBeOnTheScreen();
      expect(description).toHaveTextContent(/3% annualized bonus/);
      expect(description).toHaveTextContent(
        /by converting your stablecoins and aTokens to mUSD\./,
      );
    });

    it('renders feature tags', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.FEATURE_TAGS),
      ).toBeOnTheScreen();
    });

    it('renders all five feature tags', () => {
      const { getByText, getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      const featureTagsContainer = getByTestId(
        MoneyConvertStablecoinsTestIds.FEATURE_TAGS,
      );

      expect(getByText('Dollar-backed')).toBeOnTheScreen();
      expect(getByText('No lockups')).toBeOnTheScreen();
      expect(getByText('Daily bonus')).toBeOnTheScreen();
      expect(getByText('No MetaMask fee')).toBeOnTheScreen();
      expect(getByText('MetaMask stablecoin')).toBeOnTheScreen();
      expect(featureTagsContainer.children).toHaveLength(5);
    });

    it('renders a MusdConversionAssetRow for each token', () => {
      const { getAllByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      const rows = getAllByTestId(MusdConversionAssetRowTestIds.CONTAINER);
      expect(rows).toHaveLength(3);
    });

    it('renders token symbols', () => {
      const { getByText } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(getByText('USDC')).toBeOnTheScreen();
      expect(getByText('USDT')).toBeOnTheScreen();
      expect(getByText('DAI')).toBeOnTheScreen();
    });

    it('renders aToken rows with Max and edit buttons', () => {
      mockUseMusdConversionTokens.mockReturnValue({ tokens: mockATokens });

      const { getByText, getAllByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(getByText('aUSDC')).toBeOnTheScreen();
      expect(getByText('aUSDT')).toBeOnTheScreen();
      expect(getByText('aDAI')).toBeOnTheScreen();
      expect(
        getAllByTestId(MusdConversionAssetRowTestIds.CONTAINER),
      ).toHaveLength(3);
      expect(
        getAllByTestId(MusdConversionAssetRowTestIds.MAX_BUTTON),
      ).toHaveLength(3);
      expect(
        getAllByTestId(MusdConversionAssetRowTestIds.EDIT_BUTTON),
      ).toHaveLength(3);
    });

    it('initiates max conversion and tracks event with location when Max is pressed', () => {
      const { getAllByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      const maxButtons = getAllByTestId(
        MusdConversionAssetRowTestIds.MAX_BUTTON,
      );
      fireEvent.press(maxButtons[0]);

      expect(mockInitiateMaxConversion).toHaveBeenCalledWith(MOCK_USDC);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MONEY_HUB_TOKEN_ROW_CONVERT_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: TEST_LOCATION,
          button_action: 'max',
          asset_symbol: 'USDC',
          redirects_to:
            MUSD_EVENT_LOCATIONS.QUICK_CONVERT_MAX_BOTTOM_SHEET_CONFIRMATION_SCREEN,
        }),
      );
    });

    it('initiates custom conversion and tracks event with location when Edit is pressed', () => {
      const { getAllByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      const editButtons = getAllByTestId(
        MusdConversionAssetRowTestIds.EDIT_BUTTON,
      );
      fireEvent.press(editButtons[1]);

      expect(mockInitiateCustomConversion).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredPaymentToken: {
            address: MOCK_USDT.address,
            chainId: MOCK_USDT.chainId,
          },
        }),
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: TEST_LOCATION,
          button_action: 'custom',
          asset_symbol: 'USDT',
          redirects_to: MUSD_EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
        }),
      );
    });

    it('logs an error when max conversion fails', async () => {
      const error = new Error('max failed');
      mockInitiateMaxConversion.mockRejectedValueOnce(error);

      const { getAllByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      fireEvent.press(
        getAllByTestId(MusdConversionAssetRowTestIds.MAX_BUTTON)[0],
      );

      await waitFor(() =>
        expect(mockLoggerError).toHaveBeenCalledWith(error, {
          message:
            '[MoneyConvertStablecoins] Failed to initiate max conversion',
        }),
      );
    });

    it('logs an error when custom conversion fails', async () => {
      const error = new Error('custom failed');
      mockInitiateCustomConversion.mockRejectedValueOnce(error);

      const { getAllByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      fireEvent.press(
        getAllByTestId(MusdConversionAssetRowTestIds.EDIT_BUTTON)[0],
      );

      await waitFor(() =>
        expect(mockLoggerError).toHaveBeenCalledWith(error, {
          message:
            '[MoneyConvertStablecoins] Failed to initiate custom conversion',
        }),
      );
    });

    it('renders feature tags in dark theme', () => {
      mockUseTheme.mockReturnValue({ themeAppearance: 'dark' });

      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.FEATURE_TAGS),
      ).toBeOnTheScreen();
    });

    it('tracks unknown network and skips pending lookup when token has no chainId', () => {
      const tokenWithoutChainId = {
        ...MOCK_USDC,
        chainId: undefined,
      } as unknown as AssetType;
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [tokenWithoutChainId],
      });

      const { getAllByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      fireEvent.press(
        getAllByTestId(MusdConversionAssetRowTestIds.MAX_BUTTON)[0],
      );

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          network_name: 'unknown',
        }),
      );
    });
  });

  describe('without eligible tokens', () => {
    beforeEach(() => {
      mockUseMusdConversionTokens.mockReturnValue({ tokens: [] });
    });

    it('renders the container', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the convert title', () => {
      const { getByText } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByText(strings('money.convert_stablecoins.title')),
      ).toBeOnTheScreen();
    });

    it('renders stacked token icons', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.TOKEN_ICONS),
      ).toBeOnTheScreen();
    });

    it('renders the description', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.DESCRIPTION),
      ).toBeOnTheScreen();
    });

    it('renders feature tags', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.FEATURE_TAGS),
      ).toBeOnTheScreen();
    });

    it('renders all five feature tags when no eligible tokens', () => {
      const { getByText, getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      const featureTagsContainer = getByTestId(
        MoneyConvertStablecoinsTestIds.FEATURE_TAGS,
      );

      expect(getByText('Dollar-backed')).toBeOnTheScreen();
      expect(getByText('No lockups')).toBeOnTheScreen();
      expect(getByText('Daily bonus')).toBeOnTheScreen();
      expect(getByText('No MetaMask fee')).toBeOnTheScreen();
      expect(getByText('MetaMask stablecoin')).toBeOnTheScreen();
      expect(featureTagsContainer.children).toHaveLength(5);
    });

    it('does not render token rows', () => {
      const { queryByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(queryByTestId(MusdConversionAssetRowTestIds.CONTAINER)).toBeNull();
    });
  });
});
