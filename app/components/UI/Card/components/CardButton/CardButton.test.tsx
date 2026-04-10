import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardButton from './CardButton';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { useABTest } from '../../../../../hooks/useABTest';

const mockTrackEvent = jest.fn();
const mockBuiltEvent = { name: 'Card Button Viewed', properties: {} };
const mockBuild = jest.fn().mockReturnValue(mockBuiltEvent);
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  build: mockBuild,
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../hooks/useABTest');
jest.mock('../../../../../util/Logger', () => ({ log: jest.fn() }));

const mockUseABTest = useABTest as jest.MockedFunction<typeof useABTest>;

interface RenderOptions {
  cardState?: { hasViewedCardButton?: boolean };
  /** Set to 0 to simulate flags not yet loaded. Defaults to 1 (resolved). */
  cacheTimestamp?: number;
}

function renderWithProvider(
  component: React.ComponentType,
  { cardState = {}, cacheTimestamp = 1 }: RenderOptions = {},
) {
  return renderScreen(
    component,
    { name: 'CardButton' },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            RemoteFeatureFlagController: {
              ...backgroundState.RemoteFeatureFlagController,
              cacheTimestamp,
            },
          },
        },
        card: {
          hasViewedCardButton: false,
          ...cardState,
        },
      },
    },
  );
}

describe('CardButton Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue(mockBuiltEvent);
    mockCreateEventBuilder.mockReturnValue({
      build: mockBuild,
    });
    mockUseABTest.mockReturnValue({
      variant: { showBadge: true },
      variantName: 'withBadge',
      isActive: true,
    });
  });

  it('renders with badge (not yet viewed)', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardButton
        onPress={mockOnPress}
        touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    ));

    expect(
      getByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE),
    ).toBeOnTheScreen();
  });

  it('dispatches setHasViewedCardButton(true) and hides badge on first press', () => {
    const { getByTestId, store, queryByTestId } = renderWithProvider(() => (
      <CardButton
        onPress={mockOnPress}
        touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    ));

    const button = getByTestId(WalletViewSelectorsIDs.CARD_BUTTON);
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(store.getState().card.hasViewedCardButton).toBe(true);
    expect(
      queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('does not dispatch setHasViewedCardButton again if already viewed', () => {
    const { getByTestId, store } = renderWithProvider(
      () => (
        <CardButton
          onPress={mockOnPress}
          touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ),
      { cardState: { hasViewedCardButton: true } },
    );

    const button = getByTestId(WalletViewSelectorsIDs.CARD_BUTTON);
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(store.getState().card.hasViewedCardButton).toBe(true);
  });

  it('renders without badge when already viewed', () => {
    const { queryByTestId } = renderWithProvider(
      () => (
        <CardButton
          onPress={mockOnPress}
          touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ),
      { cardState: { hasViewedCardButton: true } },
    );

    expect(
      queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE),
    ).not.toBeOnTheScreen();
  });

  describe('A/B test: cardCARD338AbtestAttentionBadge', () => {
    it('control variant: does not show badge even when button has not been viewed', () => {
      mockUseABTest.mockReturnValue({
        variant: { showBadge: false },
        variantName: 'control',
        isActive: false,
      });

      const { queryByTestId } = renderWithProvider(() => (
        <CardButton
          onPress={mockOnPress}
          touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ));

      expect(
        queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE),
      ).toBeNull();
    });

    it('withBadge variant: shows badge when button has not been viewed', () => {
      mockUseABTest.mockReturnValue({
        variant: { showBadge: true },
        variantName: 'withBadge',
        isActive: true,
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardButton
          onPress={mockOnPress}
          touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ));

      expect(
        getByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE),
      ).toBeOnTheScreen();
    });

    it('withBadge variant: hides badge after button has been viewed', () => {
      mockUseABTest.mockReturnValue({
        variant: { showBadge: true },
        variantName: 'withBadge',
        isActive: true,
      });

      const { queryByTestId } = renderWithProvider(
        () => (
          <CardButton
            onPress={mockOnPress}
            touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
          />
        ),
        { cardState: { hasViewedCardButton: true } },
      );

      expect(
        queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE),
      ).toBeNull();
    });

    describe('analytics: CARD_BUTTON_VIEWED event', () => {
      it('fires exactly once on mount', () => {
        renderWithProvider(() => (
          <CardButton
            onPress={mockOnPress}
            touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
          />
        ));

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'Card Button Viewed',
          }),
        );
        expect(mockBuild).toHaveBeenCalledTimes(1);
        expect(mockTrackEvent).toHaveBeenCalledTimes(1);
        expect(mockTrackEvent).toHaveBeenCalledWith(mockBuiltEvent);
      });

      it('does not fire event when flags are not yet resolved (cacheTimestamp = 0)', () => {
        renderWithProvider(
          () => (
            <CardButton
              onPress={mockOnPress}
              touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
            />
          ),
          { cacheTimestamp: 0 },
        );

        expect(mockTrackEvent).not.toHaveBeenCalled();
      });
    });
  });
});
