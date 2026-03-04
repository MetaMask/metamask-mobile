import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import MarketInsightsTrendSourcesBottomSheet from './MarketInsightsTrendSourcesBottomSheet';

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactLib = jest.requireActual('react');
    const { View: MockView } = jest.requireActual('react-native');

    return ReactLib.forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<{
          onOpenBottomSheet: () => void;
          onCloseBottomSheet: () => void;
        }>,
      ) => {
        ReactLib.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));
        return <MockView testID="mock-bottom-sheet">{children}</MockView>;
      },
    );
  },
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View: MockView } = jest.requireActual('react-native');
    return ({ children }: { children: React.ReactNode }) => (
      <MockView testID="mock-bottom-sheet-header">{children}</MockView>
    );
  },
);

describe('MarketInsightsTrendSourcesBottomSheet', () => {
  it('renders article and tweet sources and triggers source callback', () => {
    const onClose = jest.fn();
    const onSourcePress = jest.fn();
    const articleUrl = 'https://www.coindesk.com/article';
    const tweetUrl = 'https://x.com/adam3us/status/123';

    const { getByText } = renderWithProvider(
      <MarketInsightsTrendSourcesBottomSheet
        isVisible
        onClose={onClose}
        onSourcePress={onSourcePress}
        trendTitle="Developer debates"
        articles={
          [
            {
              title: 'ETF demand remains high',
              source: 'coindesk.com',
              date: '2026-02-17',
              url: articleUrl,
            },
          ] as never
        }
        tweets={
          [
            {
              author: 'adam3us',
              contentSummary: 'Minority protections matter.',
              date: '2026-02-17',
              url: tweetUrl,
            },
          ] as never
        }
      />,
    );

    expect(getByText('Developer debates')).toBeOnTheScreen();
    expect(getByText('coindesk.com')).toBeOnTheScreen();
    expect(getByText('@adam3us')).toBeOnTheScreen();

    fireEvent.press(getByText('coindesk.com'));
    expect(onSourcePress).toHaveBeenCalledWith(articleUrl);

    fireEvent.press(getByText('@adam3us'));
    expect(onSourcePress).toHaveBeenCalledWith(tweetUrl);
  });

  it('renders safely when hidden and has no callbacks', () => {
    const onClose = jest.fn();

    const { queryByText } = renderWithProvider(
      <MarketInsightsTrendSourcesBottomSheet
        isVisible={false}
        onClose={onClose}
        trendTitle="Hidden"
        articles={[] as never}
        tweets={[] as never}
      />,
    );

    expect(queryByText('Hidden')).toBeOnTheScreen();
  });
});
