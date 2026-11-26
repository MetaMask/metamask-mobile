import React from 'react';
import { render } from '@testing-library/react-native';
import TokenDetailsPagePending from './TokenDetailsPagePending';
import type { TokenDetailsRouteParams } from '../constants/constants';
const mockHeader = jest.fn((_props: Record<string, unknown>) => null);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

let mockBrandRefreshEnabled = false;

jest.mock('react-redux', () => {
  const { selectTokenDetailsBrandRefreshEnabled: brandRefreshSelector } =
    jest.requireActual(
      '../../../../selectors/featureFlagController/tokenDetailsBrandRefresh',
    );
  return {
    useSelector: (selector: unknown) =>
      selector === brandRefreshSelector ? mockBrandRefreshEnabled : false,
  };
});

jest.mock('../../AssetOverview/Price/hooks/useTokenChartPreferences', () => ({
  useTokenChartPreferences: () => ({
    chartType: 2,
    chartInterval: '1h',
    indicators: [],
    setChartType: jest.fn(),
    setChartInterval: jest.fn(),
    setIndicators: jest.fn(),
  }),
}));

jest.mock('../components/TokenDetailsInlineHeader', () => {
  const { View } = jest.requireActual('react-native');
  return {
    TokenDetailsInlineHeader: (props: Record<string, unknown>) => {
      mockHeader(props);
      return <View testID="pending-header" />;
    },
    TokenDetailsIdentity: () => <View testID="token-details-identity" />,
  };
});

jest.mock('../../AssetOverview/Price/TokenPriceTitleHub', () => {
  const { View } = jest.requireActual('react-native');
  return {
    TokenPriceTitleHub: () => <View testID="pending-price" />,
  };
});

jest.mock('../../Charts/ChartLineSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <View /> };
});

jest.mock('../../Charts/AdvancedChart/TimeRangeSelector', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <View /> };
});

jest.mock('../components/TokenDetailsActions', () => {
  const { View } = jest.requireActual('react-native');
  return {
    TokenDetailsActionsSkeleton: () => <View />,
  };
});

const token = {
  address: '0x123',
  chainId: '0x1',
  symbol: 'MUSD',
  name: 'MetaMask USD',
  ticker: 'MUSD',
} as TokenDetailsRouteParams;

describe('TokenDetailsPagePending', () => {
  beforeEach(() => {
    mockBrandRefreshEnabled = false;
    mockHeader.mockClear();
  });

  it('places the token identity above the price skeleton', () => {
    const view = render(<TokenDetailsPagePending token={token} />);

    expect(mockHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        showIdentityInHeader: false,
        hideContractAddress: true,
        isGlass: false,
      }),
    );

    const serialized = JSON.stringify(view.toJSON());

    expect(serialized.indexOf('token-details-identity')).toBeGreaterThan(-1);
    expect(serialized.indexOf('token-details-identity')).toBeLessThan(
      serialized.indexOf('pending-price'),
    );
    expect(view.getByTestId('pending-header')).toBeOnTheScreen();
  });

  it('floats the glass header when brand refresh is enabled', () => {
    mockBrandRefreshEnabled = true;

    render(<TokenDetailsPagePending token={token} />);

    expect(mockHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        isGlass: true,
        onLayout: expect.any(Function),
        scrollY: expect.any(Object),
      }),
    );
  });
});
