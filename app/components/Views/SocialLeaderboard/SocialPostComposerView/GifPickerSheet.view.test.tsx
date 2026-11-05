/**
 * Component-view tests for the composer GIF picker.
 *
 * Flag routing goes through real Redux. Only Engine.controllerMessenger is
 * stubbed for SocialService:fetchTrendingGifs and SocialService:searchGifs.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/SocialPostComposerView/GifPickerSheet.view.test.tsx --runInBand --silent --coverage=false
 */
import '../../../../../tests/component-view/mocks';

import { fireEvent, screen } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import {
  gifPickerSheetHarness,
  renderGifPickerSheet,
} from '../../../../../tests/component-view/renderers/socialLeaderboard';
import { GifPickerSheetSelectorsIDs } from './GifPickerSheet.testIds';

const GIF_PREVIEW_URL = 'https://static.klipy.com/sm.gif';
const GIF_URL = 'https://static.klipy.com/md.gif';

const gifPage = {
  result: true,
  data: {
    has_next: false,
    data: [
      {
        id: 'cheers',
        title: 'Cheers',
        file: {
          sm: { gif: { url: GIF_PREVIEW_URL } },
          md: { gif: { url: GIF_URL } },
        },
      },
    ],
  },
};

const isGifAction = (action: unknown) =>
  action === 'SocialService:fetchTrendingGifs' ||
  action === 'SocialService:searchGifs';

describe('GifPickerSheet', () => {
  let messengerCall: jest.SpyInstance;

  beforeEach(() => {
    gifPickerSheetHarness.onSelect.mockReset();
    gifPickerSheetHarness.onClose.mockReset();
    messengerCall = jest
      .spyOn(Engine.controllerMessenger, 'call')
      .mockImplementation((action: string) => {
        if (isGifAction(action)) {
          return Promise.resolve(gifPage);
        }
        return Promise.resolve(undefined);
      });
  });

  afterEach(() => {
    messengerCall.mockRestore();
  });

  it('loads trending GIFs through the social API when aiSocialGifApi is on', async () => {
    renderGifPickerSheet({ presetOptions: { gifApiEnabled: true } });

    expect(
      await screen.findByTestId(GifPickerSheetSelectorsIDs.item('cheers')),
    ).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'SocialService:fetchTrendingGifs',
      expect.objectContaining({ page: 1, format_filter: 'gif' }),
    );

    fireEvent.press(
      screen.getByTestId(GifPickerSheetSelectorsIDs.item('cheers')),
    );

    expect(gifPickerSheetHarness.onSelect).toHaveBeenCalledWith(GIF_URL);
  });

  it('shows the Klipy missing-key message when aiSocialGifApi is off', async () => {
    renderGifPickerSheet();

    expect(
      await screen.findByText(
        strings('social_leaderboard.composer.gifs_missing_key'),
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(GifPickerSheetSelectorsIDs.RETRY)).toBeNull();
    expect(messengerCall).not.toHaveBeenCalledWith(
      'SocialService:fetchTrendingGifs',
      expect.anything(),
    );

    fireEvent.press(
      screen.getByTestId(GifPickerSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(gifPickerSheetHarness.onClose).toHaveBeenCalled();
  });

  it('shows an error and reloads GIFs from the social API on retry', async () => {
    messengerCall.mockImplementation((action: string) => {
      if (isGifAction(action)) {
        return Promise.reject(new Error('429'));
      }
      return Promise.resolve(undefined);
    });

    renderGifPickerSheet({ presetOptions: { gifApiEnabled: true } });

    expect(
      await screen.findByText(
        strings('social_leaderboard.composer.gifs_error'),
      ),
    ).toBeOnTheScreen();

    messengerCall.mockImplementation((action: string) => {
      if (isGifAction(action)) {
        return Promise.resolve(gifPage);
      }
      return Promise.resolve(undefined);
    });

    fireEvent.press(screen.getByTestId(GifPickerSheetSelectorsIDs.RETRY));

    expect(
      await screen.findByTestId(GifPickerSheetSelectorsIDs.item('cheers')),
    ).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'SocialService:fetchTrendingGifs',
      expect.objectContaining({ page: 1 }),
    );
  });
});
