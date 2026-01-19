import React from 'react';
import { userEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationCta from './Cta';
import { Linking } from 'react-native';
import SharedDeeplinkManager from '../../../../core/DeeplinkManager/DeeplinkManager';

jest.mock('../../../../core/DeeplinkManager/DeeplinkManager', () => {
  const mockParse = jest.fn().mockResolvedValue(true);
  return {
    __esModule: true,
    default: {
      init: jest.fn(),
      start: jest.fn(),
      getInstance: jest.fn(() => ({ parse: mockParse })),
      parse: mockParse,
      setDeeplink: jest.fn(),
      getPendingDeeplink: jest.fn(),
      expireDeeplink: jest.fn(),
    },
  };
});

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
    const { root, getByText } = renderWithProvider(
      <NotificationCta
        onClick={jest.fn()}
        cta={{ content: ctaContent, link: ctaDeeplink }}
      />,
    );

    expect(root).toBeOnTheScreen();
    await userEvent.press(getByText(ctaContent));
    expect(SharedDeeplinkManager.parse).toHaveBeenCalled();
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
