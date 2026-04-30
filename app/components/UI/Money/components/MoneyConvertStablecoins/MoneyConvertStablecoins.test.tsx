import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import MoneyConvertStablecoins from './MoneyConvertStablecoins';
import { MoneyConvertStablecoinsTestIds } from './MoneyConvertStablecoins.testIds';
import { strings } from '../../../../../../locales/i18n';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { ConvertTokenRowTestIds } from '../../../Earn/components/Musd/ConvertTokenRow';
import {
  selectHasUnapprovedMusdConversion,
  selectHasInFlightMusdConversion,
  selectMusdConversionStatuses,
} from '../../../Earn/selectors/musdConversionStatus';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events/musdEvents';

const { EVENT_LOCATIONS: MUSD_EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

const TEST_LOCATION = 'money_hub';

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

jest.mock('../../../Earn/components/Musd/ConvertTokenRow', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  const MockConvertTokenRow = ({
    token,
    onMaxPress,
    onEditPress,
  }: {
    token: { symbol: string };
    onMaxPress: (t: unknown) => void;
    onEditPress: (t: unknown) => void;
  }) => (
    <TouchableOpacity testID="convert-token-row-container">
      <Text testID="convert-token-row-token-name">{token.symbol}</Text>
      <TouchableOpacity
        testID="convert-token-row-max-button"
        onPress={() => onMaxPress(token)}
      />
      <TouchableOpacity
        testID="convert-token-row-edit-button"
        onPress={() => onEditPress(token)}
      />
    </TouchableOpacity>
  );
  MockConvertTokenRow.displayName = 'ConvertTokenRow';
  return {
    __esModule: true,
    default: MockConvertTokenRow,
    ConvertTokenRowTestIds: {
      CONTAINER: 'convert-token-row-container',
      TOKEN_NAME: 'convert-token-row-token-name',
      MAX_BUTTON: 'convert-token-row-max-button',
      EDIT_BUTTON: 'convert-token-row-edit-button',
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
    });

    it('renders the description with bonus text', () => {
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

    it('renders a ConvertTokenRow for each token', () => {
      const { getAllByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      const rows = getAllByTestId(ConvertTokenRowTestIds.CONTAINER);
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

      const maxButtons = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON);
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

      const editButtons = getAllByTestId(ConvertTokenRowTestIds.EDIT_BUTTON);
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

    it('does not render token rows', () => {
      const { queryByTestId } = render(
        <MoneyConvertStablecoins location={TEST_LOCATION} />,
      );

      expect(queryByTestId(ConvertTokenRowTestIds.CONTAINER)).toBeNull();
    });
  });
});
