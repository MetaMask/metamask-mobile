import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ClipboardManager from '../../../core/ClipboardManager';
import ShareCardComposer from './ShareCardComposer';
import type { ShareCardModel } from './ShareCard.types';
import {
  ShareCardComposerSelectorsIDs,
  ShareCardSelectorsIDs,
} from './ShareCard.testIds';
import { shareShareCardImage } from './shareCardImage';

jest.mock('./shareCardImage', () => ({
  shareShareCardImage: jest.fn(),
}));

jest.mock('../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: { setString: jest.fn() },
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockShare = jest.mocked(shareShareCardImage);
const mockSetString = jest.mocked(ClipboardManager.setString);
const LINK = 'https://link.metamask.io/position';

const card: ShareCardModel = {
  direction: 'up',
  author: { label: 'alex.eth', address: '0xabc' },
  statusLabel: 'Closed · 2 hr ago',
  market: { symbol: 'BTC', detail: 'Long 20x' },
  primaryValue: '+$1,248.50',
  changeLabel: '26.02%',
  stats: [
    { label: 'Entry', value: '$83,224.00' },
    { label: 'Exit', value: '$85,390.00' },
  ],
  chart: { points: [1, 2, 3], entryIndex: 0, exitIndex: 2 },
  promoCode: '8F3A21',
  promoCaption: 'Referral code',
};

const renderComposer = (
  props: Partial<React.ComponentProps<typeof ShareCardComposer>> = {},
) => {
  const handlers = {
    onClose: jest.fn(),
    onLinkCopied: jest.fn(),
    onShared: jest.fn(),
    onError: jest.fn(),
  };
  renderWithProvider(
    <ShareCardComposer card={card} link={LINK} {...handlers} {...props} />,
  );
  return handlers;
};

describe('ShareCardComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetString.mockResolvedValue(undefined);
    mockShare.mockResolvedValue('shared');
  });

  it('renders the card with its formatted figures', () => {
    renderComposer();

    expect(
      screen.getByTestId(ShareCardSelectorsIDs.PRIMARY_VALUE),
    ).toHaveTextContent('+$1,248.50');
    expect(screen.getByTestId(ShareCardSelectorsIDs.CHANGE)).toHaveTextContent(
      '▲ 26.02%',
    );
    expect(screen.getByTestId(ShareCardSelectorsIDs.MARKET)).toHaveTextContent(
      'BTC · Long 20x',
    );
    expect(screen.getByTestId(ShareCardSelectorsIDs.PROMO)).toBeOnTheScreen();
  });

  it('points the change arrow down on a loss card', () => {
    renderComposer({ card: { ...card, direction: 'down' } });

    expect(screen.getByTestId(ShareCardSelectorsIDs.CHANGE)).toHaveTextContent(
      '▼ 26.02%',
    );
  });

  it('hides the promo footer when there is no code', () => {
    renderComposer({ card: { ...card, promoCode: undefined } });

    expect(screen.queryByTestId(ShareCardSelectorsIDs.PROMO)).toBeNull();
  });

  it('copies the link and shows the copied label', async () => {
    const { onLinkCopied } = renderComposer();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ShareCardComposerSelectorsIDs.COPY_LINK_BUTTON),
      );
    });

    expect(mockSetString).toHaveBeenCalledWith(LINK);
    expect(onLinkCopied).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId(ShareCardComposerSelectorsIDs.COPY_LINK_BUTTON),
    ).toHaveTextContent('Copied');
  });

  it('copies the link before the card data is ready', async () => {
    renderComposer({ isReady: false });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ShareCardComposerSelectorsIDs.COPY_LINK_BUTTON),
      );
    });

    expect(mockSetString).toHaveBeenCalledWith(LINK);
  });

  it('reports a failed copy without showing the copied label', async () => {
    mockSetString.mockRejectedValue(new Error('clipboard unavailable'));
    const { onLinkCopied, onError } = renderComposer();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ShareCardComposerSelectorsIDs.COPY_LINK_BUTTON),
      );
    });

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith('copy_link', expect.any(Error)),
    );
    expect(onLinkCopied).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(ShareCardComposerSelectorsIDs.COPY_LINK_BUTTON),
    ).toHaveTextContent('Copy link');
  });

  it('hides Copy link when there is no link', () => {
    renderComposer({ link: undefined });

    expect(
      screen.queryByTestId(ShareCardComposerSelectorsIDs.COPY_LINK_BUTTON),
    ).toBeNull();
  });

  it('shares the image with the link and reports a completed share', async () => {
    const { onShared } = renderComposer();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ShareCardComposerSelectorsIDs.SHARE_BUTTON),
      );
    });

    expect(mockShare).toHaveBeenCalledWith(expect.anything(), {
      message: LINK,
    });
    expect(onShared).toHaveBeenCalledTimes(1);
  });

  it('does not report a share the user dismissed', async () => {
    mockShare.mockResolvedValue('dismissed');
    const { onShared } = renderComposer();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ShareCardComposerSelectorsIDs.SHARE_BUTTON),
      );
    });

    expect(onShared).not.toHaveBeenCalled();
  });

  it('stops loading without reporting a share when the outcome is unknown', async () => {
    mockShare.mockResolvedValue('unknown');
    const { onShared } = renderComposer();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ShareCardComposerSelectorsIDs.SHARE_BUTTON),
      );
    });

    expect(onShared).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(ShareCardComposerSelectorsIDs.SHARE_BUTTON),
    ).toHaveTextContent('Share');
  });

  it('reports a failed share', async () => {
    mockShare.mockRejectedValue(new Error('capture failed'));
    const { onError } = renderComposer();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ShareCardComposerSelectorsIDs.SHARE_BUTTON),
      );
    });

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith('share', expect.any(Error)),
    );
  });

  it('keeps Share disabled until the card is ready', async () => {
    renderComposer({ isReady: false });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ShareCardComposerSelectorsIDs.SHARE_BUTTON),
      );
    });

    expect(mockShare).not.toHaveBeenCalled();
  });

  it('closes from the header', () => {
    const { onClose } = renderComposer();

    fireEvent.press(
      screen.getByTestId(ShareCardComposerSelectorsIDs.CLOSE_BUTTON),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
