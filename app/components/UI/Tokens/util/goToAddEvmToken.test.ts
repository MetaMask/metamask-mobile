import { goToAddEvmToken } from './goToAddEvmToken';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { StackNavigationProp } from '@react-navigation/stack';
import { IMetaMetricsEvent } from '../../../../core/Analytics';

jest.mock('../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    TOKEN_IMPORT_CLICKED: 'TOKEN_IMPORT_CLICKED',
  },
}));

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

describe('goToAddEvmToken', () => {
  const mockSetIsAddTokenEnabled = jest.fn();
  const mockNavigation = { push: jest.fn() };
  const mockTrackEvent = jest.fn();
  const mockGetDecimalChainId = jest.fn(() => 1);
  const mockCreateEventBuilder = jest.fn(
    () =>
      ({
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue('mockEvent'),
      } as unknown as MetricsEventBuilder),
  );

  const mockProps = {
    setIsAddTokenEnabled: mockSetIsAddTokenEnabled,
    navigation: mockNavigation as unknown as StackNavigationProp<
      TokenListNavigationParamList,
      'AddAsset'
    >,
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

  it('should navigate to AddAsset, track event, and toggle token enable state', () => {
    goToAddEvmToken(mockProps);

    // Check if token adding was disabled first
    expect(mockSetIsAddTokenEnabled).toHaveBeenCalledWith(false);

    // Check if navigation was triggered correctly
    expect(mockNavigation.push).toHaveBeenCalledWith('AddAsset', {
      assetType: 'token',
    });

    // Check if tracking event was fired
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.TOKEN_IMPORT_CLICKED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith('mockEvent');

    // Check if token adding was re-enabled
    expect(mockSetIsAddTokenEnabled).toHaveBeenCalledWith(true);
  });
});
