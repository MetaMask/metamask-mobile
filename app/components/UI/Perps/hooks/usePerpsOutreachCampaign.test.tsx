import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, renderHook } from '@testing-library/react-native';
import bannersReducer from '../../../../reducers/banners';
import { usePerpsOutreachBanner } from './usePerpsOutreachBanner';
import {
  getPerpsOutreachDismissalKey,
  usePerpsOutreachCampaign,
} from './usePerpsOutreachCampaign';

jest.mock('./usePerpsOutreachBanner', () => ({
  usePerpsOutreachBanner: jest.fn(),
}));

const mockUsePerpsOutreachBanner = jest.mocked(usePerpsOutreachBanner);

const BANNER = {
  id: 'mobile-outreach-2026-09',
  title: "You're a top perp trader",
  body: 'Shape what we build next.',
  imageUrl: 'https://metamask.io/images/mobile-perps-outreach.png',
  linkUrl: 'https://link.metamask.io/perps-outreach',
};

const renderCampaign = (dismissedBanners: string[] = []) => {
  const store = configureStore({
    reducer: { banners: bannersReducer },
    preloadedState: {
      banners: { dismissedBanners, lastDismissedBrazeBanner: null },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    store,
    ...renderHook(() => usePerpsOutreachCampaign(), { wrapper: Wrapper }),
  };
};

describe('usePerpsOutreachCampaign', () => {
  beforeEach(() => {
    mockUsePerpsOutreachBanner.mockReturnValue({ data: BANNER } as ReturnType<
      typeof usePerpsOutreachBanner
    >);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the eligible campaign', () => {
    const { result } = renderCampaign();

    expect(result.current.campaign).toEqual(BANNER);
  });

  it('exposes no campaign while the request is unresolved', () => {
    mockUsePerpsOutreachBanner.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof usePerpsOutreachBanner>);

    const { result } = renderCampaign();

    expect(result.current.campaign).toBeNull();
  });

  it('exposes no campaign once it was dismissed', () => {
    const { result } = renderCampaign([
      getPerpsOutreachDismissalKey(BANNER.id),
    ]);

    expect(result.current.campaign).toBeNull();
  });

  it('still exposes a campaign when a different one was dismissed', () => {
    const { result } = renderCampaign([
      getPerpsOutreachDismissalKey('previous-campaign'),
    ]);

    expect(result.current.campaign).toEqual(BANNER);
  });

  it('persists dismissal for the current campaign', () => {
    const { result, store } = renderCampaign();

    act(() => {
      result.current.dismiss();
    });

    expect(store.getState().banners.dismissedBanners).toEqual([
      getPerpsOutreachDismissalKey(BANNER.id),
    ]);
    expect(result.current.campaign).toBeNull();
  });
});
