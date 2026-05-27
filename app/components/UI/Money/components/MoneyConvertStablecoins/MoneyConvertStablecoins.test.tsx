import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
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
import { MONEY_EVENTS_CONSTANTS } from '../../constants/moneyEvents';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';
import AppConstants from '../../../../../core/AppConstants';

const { EVENT_LOCATIONS: MUSD_EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;
const { EVENT_LOCATIONS: MONEY_EVENT_LOCATIONS } = MONEY_EVENTS_CONSTANTS;

const TEST_LOCATION = MONEY_EVENT_LOCATIONS.MONEY_HUB;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Linking: {
      ...actual.Linking,
      openURL: jest.fn(),
    },
  };
});

const mockUseSelector = useSelector as jest.Mock;

const mockOpenTooltipModal = jest.fn();

jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({ openTooltipModal: mockOpenTooltipModal }),
}));

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
  useMusdConversionTokens: (...args: unknown[]) =>
    mockUseMusdConversionTokens(...args),
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

const mockTokens: AssetType[] = [MOCK_USDC, MOCK_USDT, MOCK_DAI];

describe('MoneyConvertStablecoins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.DESCRIPTION),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('money.convert_stablecoins.description_suffix')),
      ).toBeOnTheScreen();
      expect(
        getByText(' by converting your stablecoins and aTokens to mUSD.'),
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

  describe('info button + tooltip', () => {
    it('renders the info button next to the title', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.INFO_BUTTON),
      ).toBeOnTheScreen();
    });

    it('opens the tooltip modal with the localized title and body when pressed', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      fireEvent.press(getByTestId(MoneyConvertStablecoinsTestIds.INFO_BUTTON));

      expect(mockOpenTooltipModal).toHaveBeenCalledTimes(1);
      const [title, body] = mockOpenTooltipModal.mock.calls[0];
      expect(title).toBe(
        strings('earn.musd_conversion.convert_and_get_percentage_bonus', {
          percentage: MUSD_CONVERSION_APY,
        }),
      );
      const { getByText, getByTestId: getInBody } = render(body);
      expect(
        getByText(
          strings('earn.musd_conversion.convert_tooltip_description', {
            percentage: MUSD_CONVERSION_APY,
          }),
          { exact: false },
        ),
      ).toBeOnTheScreen();
      expect(
        getInBody(MoneyConvertStablecoinsTestIds.TOOLTIP_TERMS_LINK),
      ).toBeOnTheScreen();
    });

    it('tracks the terms-of-use event and opens the URL when the terms link is pressed', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      fireEvent.press(getByTestId(MoneyConvertStablecoinsTestIds.INFO_BUTTON));
      const [, body] = mockOpenTooltipModal.mock.calls[0];
      const { getByTestId: getInBody } = render(body);
      fireEvent.press(
        getInBody(MoneyConvertStablecoinsTestIds.TOOLTIP_TERMS_LINK),
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: TEST_LOCATION,
        url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'built' });
      expect(Linking.openURL).toHaveBeenCalledWith(
        AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
      );
    });
  });
});
