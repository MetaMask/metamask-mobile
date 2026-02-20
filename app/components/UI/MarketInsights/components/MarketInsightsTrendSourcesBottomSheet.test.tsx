import React from 'react';
import { Linking } from 'react-native';
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
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders article and tweet sources and opens their URLs', () => {
    const onClose = jest.fn();
    const articleUrl = 'https://www.coindesk.com/article';
    const tweetUrl = 'https://x.com/adam3us/status/123';

    const { getByText } = renderWithProvider(
      <MarketInsightsTrendSourcesBottomSheet
        isVisible
        onClose={onClose}
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
    expect(Linking.openURL).toHaveBeenCalledWith(articleUrl);

    fireEvent.press(getByText('@adam3us'));
    expect(Linking.openURL).toHaveBeenCalledWith(tweetUrl);
  });
});
