import React from 'react';
import { Linking } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningSourcesBottomSheet from './WhatsHappeningSourcesBottomSheet';

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

jest.mock('../../../UI/MarketInsights/utils/marketInsightsFormatting', () => ({
  isSafeUrl: jest.fn(() => true),
  formatRelativeTime: jest.fn(() => '2h ago'),
  getFaviconUrl: jest.fn((url: string) => `https://favicon/${url}`),
}));

const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
const mockIsSafeUrl = jest.requireMock(
  '../../../UI/MarketInsights/utils/marketInsightsFormatting',
).isSafeUrl;

const articles = [
  {
    title: 'Fed pauses rate hikes',
    url: 'https://coindesk.com/fed-pauses',
    source: 'coindesk.com',
    date: '2026-03-15T10:00:00.000Z',
  },
  {
    title: 'Bitcoin ETF sees record inflows',
    url: 'https://cointelegraph.com/btc-etf',
    source: 'cointelegraph.com',
    date: '2026-03-15T09:00:00.000Z',
  },
];

describe('WhatsHappeningSourcesBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSafeUrl.mockReturnValue(true);
  });

  it('renders one row per article', () => {
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
      />,
    );
    expect(screen.getByText('coindesk.com')).toBeOnTheScreen();
    expect(screen.getByText('cointelegraph.com')).toBeOnTheScreen();
  });

  it('opens the article URL when a row is pressed and URL is safe', () => {
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
      />,
    );
    fireEvent.press(screen.getByText('coindesk.com'));
    expect(mockOpenURL).toHaveBeenCalledWith('https://coindesk.com/fed-pauses');
  });

  it('does not open the URL when isSafeUrl returns false', () => {
    mockIsSafeUrl.mockReturnValue(false);
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
      />,
    );
    fireEvent.press(screen.getByText('coindesk.com'));
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('renders the sheet title', () => {
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet
        onClose={jest.fn()}
        articles={articles as never}
      />,
    );
    expect(screen.getByText('News sources')).toBeOnTheScreen();
  });

  it('renders no article rows when articles array is empty', () => {
    renderWithProvider(
      <WhatsHappeningSourcesBottomSheet onClose={jest.fn()} articles={[]} />,
    );
    expect(screen.queryByText('coindesk.com')).toBeNull();
  });
});
