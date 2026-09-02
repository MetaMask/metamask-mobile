import React from 'react';
import { InteractionManager, Platform, Share } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import ShareReferralLinkButton from './ShareReferralLinkButton';

const SHARE_URL = 'https://example.test/join?ref=FOX123';

describe('ShareReferralLinkButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        (task as () => void)();
        return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
      });
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shares the server-supplied URL as a separate field on iOS', () => {
    Platform.OS = 'ios';
    render(<ShareReferralLinkButton shareUrl={SHARE_URL} />);

    fireEvent.press(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.SHARE_LINK_BUTTON),
    );

    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ url: SHARE_URL }),
    );
  });

  it('appends the URL to the message on Android, which has no url field', () => {
    Platform.OS = 'android';
    render(<ShareReferralLinkButton shareUrl={SHARE_URL} />);

    fireEvent.press(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.SHARE_LINK_BUTTON),
    );

    const [content] = jest.mocked(Share.share).mock.calls[0];
    expect(content).not.toHaveProperty('url');
    expect((content as { message: string }).message).toContain(SHARE_URL);
  });

  it('swallows a share failure rather than crashing the screen', () => {
    Platform.OS = 'ios';
    jest.mocked(Share.share).mockRejectedValue(new Error('share cancelled'));
    render(<ShareReferralLinkButton shareUrl={SHARE_URL} />);

    expect(() =>
      fireEvent.press(
        screen.getByTestId(REWARDS_MONEY_TEST_IDS.SHARE_LINK_BUTTON),
      ),
    ).not.toThrow();
  });
});
