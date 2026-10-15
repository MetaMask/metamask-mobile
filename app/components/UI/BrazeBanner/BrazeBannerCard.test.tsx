import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BrazeBannerCard from './BrazeBannerCard';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../../../component-library/components-temp/GlassSurface';

// ---------------------------------------------------------------------------
// Mock: design-system
// ---------------------------------------------------------------------------
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: (string | boolean | undefined)[]) =>
      args.filter(Boolean).join(' '),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const mockReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...rest
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => mockReact.createElement(View, { testID, ...rest }, children),
    Text: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => mockReact.createElement(Text, { testID }, children),
    Icon: ({ testID }: { testID?: string }) =>
      mockReact.createElement(View, { testID }),
    BoxFlexDirection: { Row: 'row', Column: 'column' },
    BoxAlignItems: { Start: 'flex-start', Center: 'center' },
    BoxBackgroundColor: { BackgroundMuted: 'bg-muted' },
    TextVariant: { BodySm: 'body-sm' },
    TextColor: {
      TextDefault: 'text-default',
      TextAlternative: 'text-alternative',
      PrimaryDefault: 'text-primary-default',
    },
    FontWeight: { Medium: '500' },
    IconName: { Close: 'close' },
    IconSize: { Md: 'md' },
    IconColor: { IconAlternative: 'icon-alternative' },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DEFAULT_BODY = 'This is a body message';

function renderCard(
  props: Partial<Parameters<typeof BrazeBannerCard>[0]> = {},
) {
  const defaults = {
    title: null,
    body: DEFAULT_BODY,
    imageUrl: null,
    ctaLabel: null,
    onDismiss: jest.fn(),
  };
  return render(<BrazeBannerCard {...defaults} {...props} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BrazeBannerCard', () => {
  it('renders the body text', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId(BRAZE_BANNER_TEST_IDS.BODY)).toBeTruthy();
  });

  it('renders the title when provided', () => {
    const { getByTestId } = renderCard({ title: 'Banner title' });
    expect(getByTestId(BRAZE_BANNER_TEST_IDS.TITLE)).toBeTruthy();
  });

  it('does not render the title element when title is null', () => {
    const { queryByTestId } = renderCard({ title: null });
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.TITLE)).toBeNull();
  });

  it('shows CTA when there is no title and ctaLabel is set', () => {
    const { getByTestId } = renderCard({ title: null, ctaLabel: 'Enable' });
    expect(getByTestId(BRAZE_BANNER_TEST_IDS.CTA)).toBeTruthy();
  });

  it('hides CTA when title is present even if ctaLabel is set', () => {
    const { queryByTestId } = renderCard({
      title: 'Title',
      ctaLabel: 'Enable',
    });
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CTA)).toBeNull();
  });

  it('hides CTA when ctaLabel is null', () => {
    const { queryByTestId } = renderCard({ title: null, ctaLabel: null });
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CTA)).toBeNull();
  });

  it('does not render the image when imageUrl is null', () => {
    const { queryByTestId } = renderCard({ imageUrl: null });
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.IMAGE)).toBeNull();
  });

  it('renders the image when imageUrl is provided', () => {
    const { getByTestId } = renderCard({
      imageUrl: 'https://example.com/image.png',
    });
    expect(getByTestId(BRAZE_BANNER_TEST_IDS.IMAGE)).toBeTruthy();
  });

  it.each([null, 'Banner title'])(
    'calls onDismiss when the dismiss button is pressed with title %s',
    (title) => {
      const onDismiss = jest.fn();
      const { getByTestId } = renderCard({ title, onDismiss });

      fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    },
  );

  describe('glass', () => {
    it('keeps the opaque card by default', () => {
      const { getByTestId } = renderCard();

      expect(
        getByTestId(BRAZE_BANNER_TEST_IDS.CARD).props.isInteractive,
      ).toBeUndefined();
    });

    it('draws the same content on an interactive glass surface', () => {
      const onDismiss = jest.fn();
      const { getByTestId } = renderCard({ isGlass: true, onDismiss });

      expect(getByTestId(BRAZE_BANNER_TEST_IDS.CARD).props.isInteractive).toBe(
        true,
      );
      expect(getByTestId(BRAZE_BANNER_TEST_IDS.BODY)).toBeOnTheScreen();
      expect(getByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toBeOnTheScreen();

      fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
