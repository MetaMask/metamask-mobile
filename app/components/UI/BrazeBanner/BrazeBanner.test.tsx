import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import Braze from '@braze/react-native-sdk';
import BrazeBanner from './BrazeBanner';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';

const TEST_PLACEMENT_ID = 'test-placement-1';

type BannerUpdateListener = (update: {
  banners: { placementId: string; html: string }[];
}) => void;

let capturedListener: BannerUpdateListener | null = null;
let mockSubscriptionRemove: jest.Mock;

jest.mock('@braze/react-native-sdk', () => {
  const mockRemove = jest.fn();
  return {
    __esModule: true,
    default: {
      Events: {
        BANNER_CARDS_UPDATED: 'bannerCardsUpdated',
      },
      BrazeBannerView: 'BrazeBannerView',
      addListener: jest.fn((_event: string, listener: BannerUpdateListener) => {
        capturedListener = listener;
        return { remove: mockRemove };
      }),
      logBannerClick: jest.fn(),
    },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: (string | boolean | undefined)[]) =>
      args.filter(Boolean).join(' '),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    Box: View,
    Skeleton: View,
    ButtonIcon: ({
      onPress,
      testID,
    }: {
      onPress: () => void;
      testID?: string;
    }) => <Pressable onPress={onPress} testID={testID} />,
    ButtonIconSize: { Sm: 'sm' },
    IconName: { Close: 'close' },
    IconColor: { IconDefault: 'icon-default' },
  };
});

const fireBannerUpdate = (
  banners: { placementId: string; html: string }[],
) => {
  act(() => {
    capturedListener?.({ banners });
  });
};

describe('BrazeBanner', () => {
  beforeEach(() => {
    capturedListener = null;
    mockSubscriptionRemove =
      (Braze.addListener as jest.Mock).mock.results[0]?.value?.remove ??
      jest.fn();
    jest.clearAllMocks();
    capturedListener = null;
  });

  it('renders a skeleton while waiting for the first banner update', () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('shows the banner when the update contains a matching banner with non-empty html', () => {
    const { getByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerUpdate([
      { placementId: TEST_PLACEMENT_ID, html: '<div>Hi</div>' },
    ]);

    expect(getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeTruthy();
  });

  it('renders nothing when the update has no banner for the placement', () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerUpdate([
      { placementId: 'other-placement', html: '<div>Hi</div>' },
    ]);

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('renders nothing when the matching banner has empty html', () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerUpdate([{ placementId: TEST_PLACEMENT_ID, html: '' }]);

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('selects the correct banner when multiple placements are in the update', () => {
    const { getByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerUpdate([
      { placementId: 'other-placement', html: '<div>Other</div>' },
      { placementId: TEST_PLACEMENT_ID, html: '<div>Mine</div>' },
    ]);

    expect(getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeTruthy();
  });

  it('hides the banner and logs a click when the dismiss button is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerUpdate([
      { placementId: TEST_PLACEMENT_ID, html: '<div>Hi</div>' },
    ]);
    expect(getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeTruthy();

    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeNull();
    expect(Braze.logBannerClick).toHaveBeenCalledWith(TEST_PLACEMENT_ID, null);
    expect(Braze.logBannerClick).toHaveBeenCalledTimes(1);
  });

  it('hides the banner when a subsequent update has no matching banner', () => {
    const { getByTestId, queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerUpdate([
      { placementId: TEST_PLACEMENT_ID, html: '<div>Hi</div>' },
    ]);
    expect(getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeTruthy();

    fireBannerUpdate([]);
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('removes the Braze listener subscription on unmount', () => {
    const { unmount } = render(<BrazeBanner placementId={TEST_PLACEMENT_ID} />);

    const subscription = (Braze.addListener as jest.Mock).mock.results[0].value;
    unmount();

    expect(subscription.remove).toHaveBeenCalledTimes(1);
  });

  it('passes the placementId prop to BrazeBannerView', () => {
    const { getByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerUpdate([
      { placementId: TEST_PLACEMENT_ID, html: '<div>Hi</div>' },
    ]);

    const container = getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER);
    expect(container).toBeTruthy();
  });
});
