import React from 'react';
import { render, act } from '@testing-library/react-native';
import BrazeBanner from './BrazeBanner';
import { BRAZE_BANNER_PLACEMENT_ID } from '../../../core/Braze/constants';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';

jest.mock('@braze/react-native-sdk', () => ({
  __esModule: true,
  default: {
    BrazeBannerView: 'BrazeBannerView',
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: (string | boolean | undefined)[]) => {
      const classNames = args.filter((a): a is string => typeof a === 'string');
      return classNames.some((c) => c.includes('opacity-0'))
        ? { opacity: 0 }
        : { opacity: 1 };
    },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: View,
  };
});

describe('BrazeBanner', () => {
  it('renders the container and banner view', () => {
    const { getByTestId } = render(<BrazeBanner />);

    expect(getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeTruthy();
    expect(getByTestId(BRAZE_BANNER_TEST_IDS.BANNER_VIEW)).toBeTruthy();
  });

  it('passes the correct placementID to BrazeBannerView', () => {
    const { getByTestId } = render(<BrazeBanner />);

    const bannerView = getByTestId(BRAZE_BANNER_TEST_IDS.BANNER_VIEW);
    expect(bannerView.props.placementID).toBe(BRAZE_BANNER_PLACEMENT_ID);
  });

  it('is hidden (opacity 0) initially before any banner content loads', () => {
    const { getByTestId } = render(<BrazeBanner />);

    const container = getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER);
    expect(container.props.style).toEqual(
      expect.objectContaining({ opacity: 0 }),
    );
    expect(container.props.pointerEvents).toBe('none');
  });

  it('becomes visible (opacity 1) when onHeightChanged reports a positive height', async () => {
    const { getByTestId } = render(<BrazeBanner />);

    const bannerView = getByTestId(BRAZE_BANNER_TEST_IDS.BANNER_VIEW);

    await act(async () => {
      bannerView.props.onHeightChanged(80);
    });

    const container = getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER);
    expect(container.props.style).toEqual(
      expect.objectContaining({ opacity: 1 }),
    );
    expect(container.props.pointerEvents).toBe('auto');
  });

  it('stays hidden when onHeightChanged reports zero height', async () => {
    const { getByTestId } = render(<BrazeBanner />);

    const bannerView = getByTestId(BRAZE_BANNER_TEST_IDS.BANNER_VIEW);

    await act(async () => {
      bannerView.props.onHeightChanged(0);
    });

    const container = getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER);
    expect(container.props.style).toEqual(
      expect.objectContaining({ opacity: 0 }),
    );
    expect(container.props.pointerEvents).toBe('none');
  });

  it('hides again when onHeightChanged reports zero after having been visible', async () => {
    const { getByTestId } = render(<BrazeBanner />);

    const bannerView = getByTestId(BRAZE_BANNER_TEST_IDS.BANNER_VIEW);

    await act(async () => {
      bannerView.props.onHeightChanged(80);
    });

    await act(async () => {
      bannerView.props.onHeightChanged(0);
    });

    const container = getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER);
    expect(container.props.style).toEqual(
      expect.objectContaining({ opacity: 0 }),
    );
    expect(container.props.pointerEvents).toBe('none');
  });
});
