import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { TapView, trackExploreEvent } from './exploreSearch';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

const mockBuild = jest.fn().mockReturnValue({});
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuilderInstance = {
  addProperties: mockAddProperties,
  addSensitiveProperties: jest.fn().mockReturnThis(),
  removeProperties: jest.fn().mockReturnThis(),
  removeSensitiveProperties: jest.fn().mockReturnThis(),
  setSaveDataRecording: jest.fn().mockReturnThis(),
  build: mockBuild,
};

jest.mock('../../../../util/analytics/analytics', () => {
  const { createAnalyticsMockModule } = jest.requireActual(
    '../../../../util/test/analyticsMock',
  );
  return createAnalyticsMockModule();
});

jest.mock('../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(),
  },
}));

const mockAnalyticsTrackEvent = analytics.trackEvent as jest.MockedFunction<
  typeof analytics.trackEvent
>;
const mockCreateEventBuilderFn =
  AnalyticsEventBuilder.createEventBuilder as jest.MockedFunction<
    typeof AnalyticsEventBuilder.createEventBuilder
  >;

describe('TapView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    const { getByText } = render(
      <TapView>
        <Text>Child content</Text>
      </TapView>,
    );

    expect(getByText('Child content')).toBeOnTheScreen();
  });

  it('calls onTap when touch ends without scroll movement', () => {
    const onTap = jest.fn();
    const { getByTestId } = render(
      <TapView onTap={onTap}>
        <View testID="content" />
      </TapView>,
    );

    const content = getByTestId('content');
    fireEvent(content, 'touchStart', { nativeEvent: { pageY: 100 } });
    fireEvent(content, 'touchEnd', {});

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('does not call onTap when vertical movement exceeds scroll threshold', () => {
    const onTap = jest.fn();
    const { getByTestId } = render(
      <TapView onTap={onTap}>
        <View testID="content" />
      </TapView>,
    );

    const content = getByTestId('content');
    fireEvent(content, 'touchStart', { nativeEvent: { pageY: 100 } });
    fireEvent(content, 'touchMove', { nativeEvent: { pageY: 120 } });
    fireEvent(content, 'touchEnd', {});

    expect(onTap).not.toHaveBeenCalled();
  });

  it('does not call onTap for upward scroll exceeding threshold', () => {
    const onTap = jest.fn();
    const { getByTestId } = render(
      <TapView onTap={onTap}>
        <View testID="content" />
      </TapView>,
    );

    const content = getByTestId('content');
    fireEvent(content, 'touchStart', { nativeEvent: { pageY: 100 } });
    fireEvent(content, 'touchMove', { nativeEvent: { pageY: 80 } });
    fireEvent(content, 'touchEnd', {});

    expect(onTap).not.toHaveBeenCalled();
  });

  it('calls onTap when vertical movement is within threshold (micro-jitter)', () => {
    const onTap = jest.fn();
    const { getByTestId } = render(
      <TapView onTap={onTap}>
        <View testID="content" />
      </TapView>,
    );

    const content = getByTestId('content');
    fireEvent(content, 'touchStart', { nativeEvent: { pageY: 100 } });
    fireEvent(content, 'touchMove', { nativeEvent: { pageY: 105 } });
    fireEvent(content, 'touchEnd', {});

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('resets scroll detection on each new touch start', () => {
    const onTap = jest.fn();
    const { getByTestId } = render(
      <TapView onTap={onTap}>
        <View testID="content" />
      </TapView>,
    );

    const content = getByTestId('content');

    // First interaction: scroll (no tap)
    fireEvent(content, 'touchStart', { nativeEvent: { pageY: 100 } });
    fireEvent(content, 'touchMove', { nativeEvent: { pageY: 120 } });
    fireEvent(content, 'touchEnd', {});
    expect(onTap).not.toHaveBeenCalled();

    // Second interaction: tap (should fire)
    fireEvent(content, 'touchStart', { nativeEvent: { pageY: 200 } });
    fireEvent(content, 'touchEnd', {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onTap is not provided', () => {
    const { getByTestId } = render(
      <TapView>
        <View testID="content" />
      </TapView>,
    );

    const content = getByTestId('content');
    expect(() => {
      fireEvent(content, 'touchStart', { nativeEvent: { pageY: 100 } });
      fireEvent(content, 'touchEnd', {});
    }).not.toThrow();
  });
});

describe('trackExploreEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilderFn.mockReturnValue(mockBuilderInstance);
  });

  it('calls analytics.trackEvent with a built event', () => {
    const mockEvent = { category: 'Explore', action: 'Click' };
    const properties = { search_query: 'bitcoin', section_name: 'Tokens' };

    trackExploreEvent(mockEvent as never, properties);

    expect(mockCreateEventBuilderFn).toHaveBeenCalledWith(mockEvent);
    expect(mockAddProperties).toHaveBeenCalledWith(properties);
    expect(mockBuild).toHaveBeenCalled();
    expect(mockAnalyticsTrackEvent).toHaveBeenCalledWith(
      mockBuild.mock.results[0].value,
    );
  });

  it('passes all properties to the event builder', () => {
    const mockEvent = { category: 'Explore', action: 'Scroll' };
    const properties = {
      search_query: 'eth',
      section_name: 'Perps',
      item_clicked: 'ETH-USD',
    };

    trackExploreEvent(mockEvent as never, properties);

    expect(mockAddProperties).toHaveBeenCalledWith(properties);
  });
});
