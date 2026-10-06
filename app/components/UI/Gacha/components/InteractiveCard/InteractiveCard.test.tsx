import React from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import {
  PointerType,
  State,
  type PanGesture,
  type GestureStateChangeEvent,
  type PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { getAnimatedStyle } from 'react-native-reanimated';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { GachaInteractiveCardTestIds } from '../../Gacha.testIds';
import InteractiveCard from './InteractiveCard';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

const CARD = {
  name: 'Charizard PSA 10',
  frontImage: 'https://cards.test/front.png',
  backImage: 'https://cards.test/back.png',
};
const PREVIEWS = {
  frontPreviewImage: 'https://cards.test/front-medium.webp',
  backPreviewImage: 'https://cards.test/back-medium.webp',
};
const INITIAL_APP_STATE = AppState.currentState;
const frontLabel = (name = CARD.name) =>
  strings('gacha.card.front_label', { name });
const backLabel = () => strings('gacha.card.back_label', { name: CARD.name });
const cardButton = () =>
  screen.getByTestId(GachaInteractiveCardTestIds.CONTAINER);
const waitForImages = () => waitFor(() => expect(cardButton()).toBeEnabled());
const getPan = () =>
  getByGestureTestId(GachaInteractiveCardTestIds.PAN_GESTURE) as PanGesture;
const panEvent = (
  translationX: number,
): GestureStateChangeEvent<PanGestureHandlerEventPayload> => ({
  handlerTag: getPan().handlerTag,
  state: State.ACTIVE,
  oldState: State.BEGAN,
  pointerType: PointerType.TOUCH,
  numberOfPointers: 1,
  x: translationX,
  y: 0,
  absoluteX: translationX,
  absoluteY: 0,
  translationX,
  translationY: 0,
  velocityX: 0,
  velocityY: 0,
});
const measureCard = async () => {
  fireEvent(cardButton(), 'layout', {
    nativeEvent: { layout: { width: 260, height: 440, x: 0, y: 0 } },
  });
  await waitFor(() => expect(getPan().config.enabled).toBe(true));
};

describe('InteractiveCard', () => {
  beforeEach(() => {
    AppState.currentState = 'active';
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    AppState.currentState = INITIAL_APP_STATE;
    jest.restoreAllMocks();
  });

  it('enables flipping after both images load and announces the displayed face', async () => {
    renderWithProvider(<InteractiveCard {...CARD} />);
    expect(cardButton()).toBeDisabled();
    await waitForImages();

    fireEvent.press(cardButton());

    expect(cardButton()).toHaveProp('accessibilityLabel', backLabel());
    expect(cardButton()).toHaveProp('accessibilityRole', 'button');
    fireEvent.press(cardButton());
    expect(cardButton()).toHaveProp('accessibilityLabel', frontLabel());
  });

  it('keeps the front visible without offering a flip when the back is missing', () => {
    renderWithProvider(<InteractiveCard {...CARD} backImage={undefined} />);

    fireEvent.press(cardButton());

    expect(cardButton()).toBeDisabled();
    expect(cardButton()).toHaveProp('accessibilityRole', 'image');
    expect(cardButton()).toHaveProp('accessibilityLabel', frontLabel());
    expect(
      screen.queryByTestId(GachaInteractiveCardTestIds.BACK, {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });

  it('returns to the front and disables flipping when the back image fails', async () => {
    renderWithProvider(<InteractiveCard {...CARD} />);
    await waitForImages();
    fireEvent.press(cardButton());

    fireEvent(
      screen.getByTestId(GachaInteractiveCardTestIds.BACK, {
        includeHiddenElements: true,
      }),
      'error',
      { error: 'Image unavailable' },
    );

    expect(cardButton()).toBeDisabled();
    expect(cardButton()).toHaveProp('accessibilityLabel', frontLabel());
    expect(cardButton()).toHaveProp('accessibilityRole', 'image');
  });

  it('resets to the front and waits for new images when the card changes', async () => {
    const { rerender } = renderWithProvider(<InteractiveCard {...CARD} />);
    await waitForImages();
    fireEvent.press(cardButton());

    rerender(
      <InteractiveCard
        name="Pikachu PSA 9"
        frontImage="https://cards.test/pikachu-front.png"
        backImage="https://cards.test/pikachu-back.png"
      />,
    );

    expect(cardButton()).toBeDisabled();
    expect(cardButton()).toHaveProp(
      'accessibilityLabel',
      frontLabel('Pikachu PSA 9'),
    );
    await waitForImages();
    expect(cardButton()).toHaveProp(
      'accessibilityLabel',
      frontLabel('Pikachu PSA 9'),
    );
  });

  it('preserves the loaded slab proportions when the back image arrives later', async () => {
    const { rerender } = renderWithProvider(
      <InteractiveCard {...CARD} backImage={undefined} />,
    );
    fireEvent(
      screen.getByTestId(GachaInteractiveCardTestIds.FRONT, {
        includeHiddenElements: true,
      }),
      'load',
      { source: { width: 600, height: 1000 } },
    );
    expect(cardButton()).toHaveStyle({ aspectRatio: 0.6 });

    rerender(<InteractiveCard {...CARD} />);

    expect(cardButton()).toHaveStyle({ aspectRatio: 0.6 });
    await waitForImages();
    expect(cardButton()).toHaveStyle({ aspectRatio: 0.6 });
  });

  it('enables flipping from the previews while keeping their proportions during the HD upgrade', () => {
    renderWithProvider(<InteractiveCard {...CARD} {...PREVIEWS} />);
    const front = screen.getByTestId(GachaInteractiveCardTestIds.FRONT, {
      includeHiddenElements: true,
    });
    const back = screen.getByTestId(GachaInteractiveCardTestIds.BACK, {
      includeHiddenElements: true,
    });

    fireEvent(front, 'load', { source: { width: 600, height: 1000 } });
    fireEvent(back, 'load', { source: { width: 600, height: 1000 } });

    expect(cardButton()).toBeEnabled();
    expect(cardButton()).toHaveStyle({ aspectRatio: 0.6 });
    expect(front).toHaveProp('source', { uri: CARD.frontImage });
    expect(back).toHaveProp('source', { uri: CARD.backImage });

    fireEvent(front, 'load', { source: { width: 1200, height: 1999 } });

    expect(cardButton()).toHaveStyle({ aspectRatio: 0.6 });
  });

  it('keeps flipping available when an HD face fails after its preview loaded', () => {
    renderWithProvider(<InteractiveCard {...CARD} {...PREVIEWS} />);
    const front = screen.getByTestId(GachaInteractiveCardTestIds.FRONT, {
      includeHiddenElements: true,
    });
    const back = screen.getByTestId(GachaInteractiveCardTestIds.BACK, {
      includeHiddenElements: true,
    });
    fireEvent(front, 'load', { source: { width: 600, height: 1000 } });
    fireEvent(back, 'load', { source: { width: 600, height: 1000 } });

    fireEvent(back, 'error');
    fireEvent.press(cardButton());

    expect(cardButton()).toBeEnabled();
    expect(cardButton()).toHaveProp('accessibilityLabel', backLabel());
    expect(back).toHaveProp('source', { uri: PREVIEWS.backPreviewImage });
  });

  it('keeps the original images through dragging and flipping after both previews upgrade', async () => {
    renderWithProvider(<InteractiveCard {...CARD} {...PREVIEWS} />);
    const front = screen.getByTestId(GachaInteractiveCardTestIds.FRONT, {
      includeHiddenElements: true,
    });
    const back = screen.getByTestId(GachaInteractiveCardTestIds.BACK, {
      includeHiddenElements: true,
    });
    fireEvent(front, 'load', { source: { width: 600, height: 1000 } });
    fireEvent(back, 'load', { source: { width: 600, height: 1000 } });
    fireEvent(front, 'load', { source: { width: 1200, height: 2000 } });
    fireEvent(back, 'load', { source: { width: 1200, height: 2000 } });
    await measureCard();
    const pan = getPan();
    expect(front).toHaveProp('source', { uri: CARD.frontImage });
    expect(back).toHaveProp('source', { uri: CARD.backImage });

    act(() => {
      pan.handlers.onStart?.(panEvent(0));
      pan.handlers.onUpdate?.(panEvent(130));
    });

    expect(front).toHaveProp('source', { uri: CARD.frontImage });
    expect(back).toHaveProp('source', { uri: CARD.backImage });

    await act(async () => {
      pan.handlers.onFinalize?.(panEvent(130), true);
    });

    expect(cardButton()).toHaveProp('accessibilityLabel', backLabel());
    expect(front).toHaveProp('source', { uri: CARD.frontImage });
    expect(back).toHaveProp('source', { uri: CARD.backImage });

    fireEvent.press(cardButton());

    expect(cardButton()).toHaveProp('accessibilityLabel', frontLabel());
    expect(front).toHaveProp('source', { uri: CARD.frontImage });
    expect(back).toHaveProp('source', { uri: CARD.backImage });
  });

  it('preserves the original images, proportions and displayed face when previews arrive later', () => {
    const { rerender } = renderWithProvider(<InteractiveCard {...CARD} />);
    const front = screen.getByTestId(GachaInteractiveCardTestIds.FRONT, {
      includeHiddenElements: true,
    });
    const back = screen.getByTestId(GachaInteractiveCardTestIds.BACK, {
      includeHiddenElements: true,
    });
    fireEvent(front, 'load', { source: { width: 1200, height: 2000 } });
    fireEvent(back, 'load', { source: { width: 1200, height: 2000 } });
    fireEvent.press(cardButton());
    expect(cardButton()).toHaveProp('accessibilityLabel', backLabel());

    rerender(<InteractiveCard {...CARD} {...PREVIEWS} />);

    expect(cardButton()).toBeEnabled();
    expect(cardButton()).toHaveStyle({ aspectRatio: 0.6 });
    expect(cardButton()).toHaveProp('accessibilityLabel', backLabel());
    expect(front).toHaveProp('source', { uri: CARD.frontImage });
    expect(back).toHaveProp('source', { uri: CARD.backImage });
  });

  it('turns edge-on with the finger before snapping to the back on release', async () => {
    renderWithProvider(<InteractiveCard {...CARD} />);
    await waitForImages();
    await measureCard();
    const pan = getPan();
    const edge = screen.getByTestId(GachaInteractiveCardTestIds.EDGE, {
      includeHiddenElements: true,
    });

    act(() => {
      pan.handlers.onStart?.(panEvent(0));
      pan.handlers.onUpdate?.(panEvent(130));
    });

    await waitFor(() => expect(edge).toHaveAnimatedStyle({ opacity: 1 }));
    expect(cardButton()).toHaveProp('accessibilityLabel', frontLabel());
    await act(async () => {
      pan.handlers.onFinalize?.(panEvent(130), true);
    });
    expect(cardButton()).toHaveProp('accessibilityLabel', backLabel());
    await waitFor(() => expect(getAnimatedStyle(edge).opacity).toBeCloseTo(0));
  });

  it('returns to the front after a short drag even when the swipe is fast', async () => {
    renderWithProvider(<InteractiveCard {...CARD} />);
    await waitForImages();
    await measureCard();

    await act(async () => {
      fireGestureHandler(getPan(), [
        { state: State.BEGAN, translationX: 0 },
        { state: State.ACTIVE, translationX: 0 },
        { state: State.ACTIVE, translationX: 30, velocityX: 1500 },
        { state: State.END, translationX: 30, velocityX: 1500 },
      ]);
    });

    expect(cardButton()).toHaveProp('accessibilityLabel', frontLabel());
  });

  it('restores the previous face when a drag is cancelled', async () => {
    renderWithProvider(<InteractiveCard {...CARD} />);
    await waitForImages();
    await measureCard();
    fireEvent.press(cardButton());

    await act(async () => {
      fireGestureHandler(getPan(), [
        { state: State.BEGAN, translationX: 0 },
        { state: State.ACTIVE, translationX: 0 },
        { state: State.ACTIVE, translationX: 260 },
        { state: State.CANCELLED, translationX: 260 },
      ]);
    });

    expect(cardButton()).toHaveProp('accessibilityLabel', backLabel());
  });
});
