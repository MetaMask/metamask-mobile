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

const mockUseABTest = useABTest as jest.MockedFunction<typeof useABTest>;

interface PartialCardState {
  hasViewedCardButton?: boolean;
}

function renderWithProvider(
  component: React.ComponentType,
  stateOverride: PartialCardState = {},
) {
  return renderScreen(
    component,
    { name: 'CardButton' },
    {
      state: {
        engine: { backgroundState },
        card: {
          cardholderAccounts: [],
          hasViewedCardButton: false,
          isLoaded: false,
          ...stateOverride,
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
      { hasViewedCardButton: true },
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
      { hasViewedCardButton: true },
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
        { hasViewedCardButton: true },
      );

      expect(
        queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON_BADGE),
      ).toBeNull();
    });

    describe('analytics: CARD_BUTTON_VIEWED event', () => {
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
