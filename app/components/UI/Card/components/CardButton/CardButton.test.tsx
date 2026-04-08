import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardButton from './CardButton';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { useABTest } from '../../../../../hooks/useABTest';
import { CARD_BUTTON_BADGE_AB_KEY } from './abTestConfig';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({});
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
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
    mockBuild.mockReturnValue({});
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockUseABTest.mockReturnValue({
      variant: { showBadge: true },
      variantName: 'withBadge',
      isActive: true,
    });
  });

  it('renders with badge (not yet viewed) and matches snapshot', () => {
    const { toJSON, getByTestId } = renderWithProvider(() => (
      <CardButton
        onPress={mockOnPress}
        touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />
    ));

    expect(
      getByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE),
    ).toBeOnTheScreen();
    expect(toJSON()).toMatchSnapshot();
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
    expect(queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE)).toBeNull();
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
    const { toJSON, queryByTestId } = renderWithProvider(
      () => (
        <CardButton
          onPress={mockOnPress}
          touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />
      ),
      { cardState: { hasViewedCardButton: true } },
    );

    expect(queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE)).toBeNull();
    expect(toJSON()).toMatchSnapshot();
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

        expect(mockTrackEvent).toHaveBeenCalledTimes(1);
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

      it('includes active_ab_tests when withBadge variant is active', () => {
        mockUseABTest.mockReturnValue({
          variant: { showBadge: true },
          variantName: 'withBadge',
          isActive: true,
        });

        renderWithProvider(() => (
          <CardButton
            onPress={mockOnPress}
            touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
          />
        ));

        expect(mockAddProperties).toHaveBeenCalledWith({
          active_ab_tests: [
            { key: CARD_BUTTON_BADGE_AB_KEY, value: 'withBadge' },
          ],
        });
      });

      it('omits active_ab_tests when control variant is inactive', () => {
        mockUseABTest.mockReturnValue({
          variant: { showBadge: false },
          variantName: 'control',
          isActive: false,
        });

        renderWithProvider(() => (
          <CardButton
            onPress={mockOnPress}
            touchAreaSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
          />
        ));

        expect(mockAddProperties).toHaveBeenCalledWith({});
      });
    });
  });
});
