import { goToAddEvmToken } from './goToAddEvmToken';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../../core/NavigationService/types';

jest.mock('../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    TOKEN_IMPORT_CLICKED: 'TOKEN_IMPORT_CLICKED',
  },
}));

describe('goToAddEvmToken', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };
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
    navigation:
      mockNavigation as unknown as StackNavigationProp<RootStackParamList>,
    trackEvent: mockTrackEvent,
    createEventBuilder:
      mockCreateEventBuilder as unknown as typeof AnalyticsEventBuilder.createEventBuilder,
    getDecimalChainId: mockGetDecimalChainId,
    currentChainId: '0x1',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to AddAsset and tracks event', () => {
    goToAddEvmToken(mockProps);

    // Check if navigation was triggered correctly
    expect(mockNavigation.navigate).toHaveBeenCalledWith('AddAsset', {
      assetType: 'token',
    });

    // Check if tracking event was fired
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.TOKEN_IMPORT_CLICKED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith('mockEvent');
  });
});
