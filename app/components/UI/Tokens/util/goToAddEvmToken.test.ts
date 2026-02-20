import { goToAddEvmToken } from './goToAddEvmToken';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { StackNavigationProp } from '@react-navigation/stack';

jest.mock('../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    TOKEN_IMPORT_CLICKED: 'TOKEN_IMPORT_CLICKED',
  },
}));

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

describe('goToAddEvmToken', () => {
  const mockNavigation = { push: jest.fn() };
  const mockTrackEvent = jest.fn();
  const mockGetDecimalChainId = jest.fn(() => 1);
  const mockCreateEventBuilder = jest.fn(
    () =>
      ({
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue('mockEvent'),
      }) as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >,
  );

  const mockProps = {
    navigation: mockNavigation as unknown as StackNavigationProp<
      TokenListNavigationParamList,
      'AddAsset'
    >,
    trackEvent: mockTrackEvent,
    createEventBuilder:
      mockCreateEventBuilder as unknown as typeof AnalyticsEventBuilder.createEventBuilder,
    getDecimalChainId: mockGetDecimalChainId,
    currentChainId: '0x1',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate to AddAsset and track event', () => {
    goToAddEvmToken(mockProps);

    // Check if navigation was triggered correctly
    expect(mockNavigation.push).toHaveBeenCalledWith('AddAsset', {
      assetType: 'token',
    });

    // Check if tracking event was fired
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.TOKEN_IMPORT_CLICKED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith('mockEvent');
  });
});
