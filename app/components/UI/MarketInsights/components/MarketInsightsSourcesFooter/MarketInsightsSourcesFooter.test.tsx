import React from 'react';
import { Linking, Pressable } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsSourcesFooter from './MarketInsightsSourcesFooter';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactLib = jest.requireActual('react');
    const { View: MockView, Pressable: MockPressable } =
      jest.requireActual('react-native');

    return ReactLib.forwardRef(
      (
        {
          children,
          onClose,
        }: { children: React.ReactNode; onClose?: () => void },
        ref: React.Ref<{
          onOpenBottomSheet: () => void;
          onCloseBottomSheet: () => void;
        }>,
      ) => {
        ReactLib.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));
        return (
          <MockView testID="mock-bottom-sheet">
            <MockPressable testID="mock-bottom-sheet-close" onPress={onClose} />
            {children}
          </MockView>
        );
      },
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View: MockView } = jest.requireActual('react-native');
    return ({ children }: { children: React.ReactNode }) => (
      <MockView testID="mock-bottom-sheet-header">{children}</MockView>
    );
  },
);

describe('MarketInsightsSourcesFooter', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens sources sheet and opens source URL when a source is pressed', () => {
    const onSourcePress = jest.fn();
    const sources = [
      { name: 'CoinDesk', type: 'news', url: 'https://coindesk.com/article-1' },
      { name: 'The Block', type: 'news', url: 'https://theblock.co/article-2' },
    ];

    const { UNSAFE_getAllByType, getByText } = renderWithProvider(
      <MarketInsightsSourcesFooter
        sources={sources as never}
        onSourcePress={onSourcePress}
        testID="sources"
      />,
    );

    const pressables = UNSAFE_getAllByType(Pressable);
    fireEvent.press(pressables[0]);

    expect(getByText('CoinDesk')).toBeOnTheScreen();

    fireEvent.press(getByText('CoinDesk'));
    expect(onSourcePress).toHaveBeenCalledWith(
      'https://coindesk.com/article-1',
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://coindesk.com/article-1',
    );
  });

  it('calls thumbs callbacks when thumb buttons are pressed', () => {
    const onThumbsUp = jest.fn();
    const onThumbsDown = jest.fn();
    const sources = [
      { name: 'CoinDesk', type: 'news', url: 'https://coindesk.com/article-1' },
    ];

    const { getByTestId } = renderWithProvider(
      <MarketInsightsSourcesFooter
        sources={sources as never}
        onThumbsUp={onThumbsUp}
        onThumbsDown={onThumbsDown}
        testID="sources"
      />,
    );

    fireEvent.press(getByTestId(MarketInsightsSelectorsIDs.THUMBS_UP_BUTTON));
    fireEvent.press(getByTestId(MarketInsightsSelectorsIDs.THUMBS_DOWN_BUTTON));

    expect(onThumbsUp).toHaveBeenCalledTimes(1);
    expect(onThumbsDown).toHaveBeenCalledTimes(1);
  });

  it('closes sources sheet when bottom sheet onClose is triggered', () => {
    const sources = [
      { name: 'CoinDesk', type: 'news', url: 'https://coindesk.com/article-1' },
    ];

    const { UNSAFE_getAllByType, getByTestId, queryByTestId } =
      renderWithProvider(
        <MarketInsightsSourcesFooter
          sources={sources as never}
          testID="sources"
        />,
      );

    const pressables = UNSAFE_getAllByType(Pressable);
    fireEvent.press(pressables[0]);
    expect(getByTestId('mock-bottom-sheet')).toBeOnTheScreen();

    fireEvent.press(getByTestId('mock-bottom-sheet-close'));
    expect(queryByTestId('mock-bottom-sheet')).toBeNull();
  });
});
