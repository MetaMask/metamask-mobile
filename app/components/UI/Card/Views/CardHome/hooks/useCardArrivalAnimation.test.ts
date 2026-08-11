import { act } from '@testing-library/react-native';
import {
  renderHookWithProvider,
  type ProviderValues,
} from '../../../../../../util/test/renderWithProvider';
import {
  initialState as initialCardState,
  setCardArrivalAnimationSeen,
  setCardArrivalPreviewRequested,
} from '../../../../../../core/redux/slices/card';
import { CardType } from '../../../types';
import { CARD_ARRIVAL_PENDING_TIMEOUT_MS } from '../../../util/cardArrival';
import { useCardArrivalAnimation } from './useCardArrivalAnimation';

type FadeCallback = (finished?: boolean) => void;

const mockFadeCallbacks: FadeCallback[] = [];

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    withTiming: (
      toValue: number,
      _config: unknown,
      callback?: FadeCallback,
    ) => {
      if (callback) mockFadeCallbacks.push(callback);
      return toValue;
    },
  };
});

// `scheduleOnRN` hands the callback back to the JS thread on a microtask, so
// the dispatch lands a tick after the fade reports finished.
const completeFade = async (finished: boolean) => {
  await act(async () => {
    mockFadeCallbacks.forEach((callback) => callback(finished));
  });
};

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockArrivalFlag = jest.fn<boolean, []>();
const mockTiltFlag = jest.fn<boolean, []>();
jest.mock('../../../../Money/selectors/featureFlags', () => ({
  ...jest.requireActual('../../../../Money/selectors/featureFlags'),
  selectMoneyCardArrivalAnimationEnabledFlag: () => mockArrivalFlag(),
  selectMoneyCardTiltAnimationEnabledFlag: () => mockTiltFlag(),
}));

const mockReduceMotion = jest.fn<boolean | null, []>();
jest.mock('../../../../Money/hooks/useReduceMotion', () => ({
  ...jest.requireActual('../../../../Money/hooks/useReduceMotion'),
  useReduceMotionState: () => mockReduceMotion(),
}));

type ArrivalOptions = Partial<Parameters<typeof useCardArrivalAnimation>[0]> & {
  cardType: CardType | undefined;
  alreadySeen?: boolean;
  previewRequested?: boolean;
};

const renderArrivalHook = ({
  alreadySeen = false,
  previewRequested = false,
  ...params
}: ArrivalOptions) =>
  renderHookWithProvider(
    () =>
      useCardArrivalAnimation({
        fromCardOnboarding: true,
        isRevealingCardDetails: false,
        ...params,
      }),
    {
      state: {
        card: {
          ...initialCardState,
          cardArrivalAnimationSeen: alreadySeen,
          cardArrivalPreviewRequested: previewRequested,
        },
      } as ProviderValues['state'],
    },
  );

describe('useCardArrivalAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockFadeCallbacks.length = 0;
    mockArrivalFlag.mockReturnValue(true);
    mockTiltFlag.mockReturnValue(true);
    mockReduceMotion.mockReturnValue(false);
  });

  describe('when the reveal should play', () => {
    it('renders the card as Rive for a virtual card reached from onboarding', () => {
      const { result } = renderArrivalHook({ cardType: CardType.VIRTUAL });

      expect(result.current.usesRiveCard).toBe(true);
    });

    it('plays when the developer-options replay is requested', () => {
      const { result } = renderArrivalHook({
        cardType: CardType.VIRTUAL,
        fromCardOnboarding: false,
        previewRequested: true,
      });

      expect(result.current.usesRiveCard).toBe(true);
    });

    it('gives the Rive view a fresh key so its one-shot trigger can re-fire', () => {
      const { result } = renderArrivalHook({ cardType: CardType.VIRTUAL });

      expect(result.current.revealKey).toBeGreaterThan(0);
    });

    it('marks the arrival as seen once the fade completes', async () => {
      renderArrivalHook({ cardType: CardType.VIRTUAL });

      expect(mockDispatch).not.toHaveBeenCalled();

      await completeFade(true);

      expect(mockDispatch).toHaveBeenCalledWith(
        setCardArrivalAnimationSeen(true),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setCardArrivalPreviewRequested(false),
      );
    });

    it('leaves the arrival unseen when the fade is interrupted', async () => {
      renderArrivalHook({ cardType: CardType.VIRTUAL });

      await completeFade(false);

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('when the reveal should not play', () => {
    it.each([CardType.PHYSICAL, CardType.METAL])(
      'renders the static card for a %s card without marking it seen',
      (cardType) => {
        const { result } = renderArrivalHook({ cardType });

        expect(result.current.usesRiveCard).toBe(false);
        expect(result.current.cardStyle.opacity).toBe(1);
        expect(mockDispatch).not.toHaveBeenCalled();
      },
    );

    it('renders the static card when reduce motion is on', () => {
      mockReduceMotion.mockReturnValue(true);
      const { result } = renderArrivalHook({ cardType: CardType.VIRTUAL });
      expect(result.current.usesRiveCard).toBe(false);
    });

    it('renders the static card when the arrival kill switch is off', () => {
      mockArrivalFlag.mockReturnValue(false);
      const { result } = renderArrivalHook({ cardType: CardType.VIRTUAL });
      expect(result.current.usesRiveCard).toBe(false);
    });

    // Skipped rather than fading in the static card and burning the one-shot.
    it('renders the static card when the tilt kill switch is off', () => {
      mockTiltFlag.mockReturnValue(false);
      const { result } = renderArrivalHook({ cardType: CardType.VIRTUAL });
      expect(result.current.usesRiveCard).toBe(false);
    });

    it('yields the static card while the user views their card details', () => {
      const { result } = renderArrivalHook({
        cardType: CardType.VIRTUAL,
        isRevealingCardDetails: true,
      });
      expect(result.current.usesRiveCard).toBe(false);
    });

    it('renders the static card on an ordinary dashboard visit', () => {
      const { result } = renderArrivalHook({
        cardType: CardType.VIRTUAL,
        fromCardOnboarding: false,
      });
      expect(result.current.usesRiveCard).toBe(false);
    });

    it('renders the static card once the reveal has already been seen', () => {
      const { result } = renderArrivalHook({
        cardType: CardType.VIRTUAL,
        alreadySeen: true,
      });
      expect(result.current.usesRiveCard).toBe(false);
    });
  });

  describe('while an input is unresolved', () => {
    it('withholds the card until the card type arrives', () => {
      const { result } = renderArrivalHook({ cardType: undefined });

      expect(result.current.cardStyle.opacity).toBe(0);
      expect(result.current.usesRiveCard).toBe(false);
    });

    it('withholds the card while the reduce motion lookup is pending', () => {
      mockReduceMotion.mockReturnValue(null);

      const { result } = renderArrivalHook({ cardType: CardType.VIRTUAL });

      expect(result.current.cardStyle.opacity).toBe(0);
    });

    it('shows the card anyway once the wait times out', () => {
      jest.useFakeTimers();

      const { result } = renderArrivalHook({ cardType: undefined });

      expect(result.current.cardStyle.opacity).toBe(0);

      act(() => {
        jest.advanceTimersByTime(CARD_ARRIVAL_PENDING_TIMEOUT_MS);
      });

      expect(result.current.cardStyle.opacity).toBe(1);
      expect(result.current.usesRiveCard).toBe(false);
    });

    it('does not withhold the card for a user who is not eligible', () => {
      mockReduceMotion.mockReturnValue(null);

      const { result } = renderArrivalHook({
        cardType: undefined,
        fromCardOnboarding: false,
      });

      expect(result.current.cardStyle.opacity).toBe(1);
    });
  });
});
