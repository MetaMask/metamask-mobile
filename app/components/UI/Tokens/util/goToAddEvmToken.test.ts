import { goToAddEvmToken } from './goToAddEvmToken';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { StackNavigationProp } from '@react-navigation/stack';
import { IMetaMetricsEvent } from '../../../../core/Analytics';
import type { RootStackParamList } from '../../../../core/NavigationService/types';

jest.mock('../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    TOKEN_IMPORT_CLICKED: 'TOKEN_IMPORT_CLICKED',
  },
}));

describe('goToAddEvmToken', () => {
  const mockNavigation = {
    dispatch: jest.fn(),
  };
  const mockTrackEvent = jest.fn();
  const mockGetDecimalChainId = jest.fn(() => 1);
  const mockCreateEventBuilder = jest.fn(
    () =>
      ({
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue('mockEvent'),
      }) as unknown as MetricsEventBuilder,
  );

  const mockProps = {
    navigation:
      mockNavigation as unknown as StackNavigationProp<RootStackParamList>,
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder as unknown as (
      event: IMetaMetricsEvent,
    ) => MetricsEventBuilder,
    getDecimalChainId: mockGetDecimalChainId,
    currentChainId: '0x1',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to AddAsset and tracks event', () => {
    goToAddEvmToken(mockProps);

    // Check if navigation was triggered correctly
    expect(mockNavigation.dispatch).toHaveBeenCalled();

    // Check if tracking event was fired
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.TOKEN_IMPORT_CLICKED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith('mockEvent');
  });
});
