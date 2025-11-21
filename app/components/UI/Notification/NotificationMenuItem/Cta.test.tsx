import React from 'react';
import { userEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationCta from './Cta';
import SharedDeeplinkManager from '../../../../core/DeeplinkManager/SharedDeeplinkManager';
import { Linking } from 'react-native';

describe('NotificationCta', () => {
  const ctaContent = 'Test Link';
  const ctaDeeplink = 'https://link.metamask.io/foo';
  const ctaExternalLink = 'https://www.google.com';

  it('does not render CTA when not available', () => {
    const { root } = renderWithProvider(
      <NotificationCta onClick={jest.fn()} cta={undefined} />,
    );
    expect(root).toBeUndefined();
  });

  it('handles universal CTAs', async () => {
    const mockParseDeeplink = jest
      .spyOn(SharedDeeplinkManager, 'parse')
      .mockImplementation(jest.fn());
    const { root, getByText } = renderWithProvider(
      <NotificationCta
        onClick={jest.fn()}
        cta={{ content: ctaContent, link: ctaDeeplink }}
      />,
    );

    expect(root).toBeOnTheScreen();
    await userEvent.press(getByText(ctaContent));
    expect(mockParseDeeplink).toHaveBeenCalled();
  });

  it('handles external CTAs', async () => {
    const mockOpenUrl = jest
      .spyOn(Linking, 'openURL')
      .mockImplementation(jest.fn());

    const { root, getByText } = renderWithProvider(
      <NotificationCta
        onClick={jest.fn()}
        cta={{ content: ctaContent, link: ctaExternalLink }}
      />,
    );

    expect(root).toBeOnTheScreen();
    await userEvent.press(getByText(ctaContent));
    expect(mockOpenUrl).toHaveBeenCalled();
  });
});
