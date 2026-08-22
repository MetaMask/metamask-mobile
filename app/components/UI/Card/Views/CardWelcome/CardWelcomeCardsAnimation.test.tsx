import React from 'react';
import { StyleSheet } from 'react-native';
import { render, act } from '@testing-library/react-native';
import CardWelcomeCardsAnimation, {
  CARDS_IN_DURATION_MS,
} from './CardWelcomeCardsAnimation';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import {
  __clearLastMockedMethods,
  __getLastMockedMethods,
  RiveRef,
} from '../../../../../__mocks__/rive-react-native';

jest.mock('../../../../../images/stacked-cards.png', () => 1);

jest.mock(
  '../../../../../animations/onboarding_card_education_v3.riv',
  () => 1,
  { virtual: true },
);

const getRiveOnError = () => {
  const methods = __getLastMockedMethods() as
    | (RiveRef & { onError?: (error: unknown) => void })
    | undefined;
  return methods?.onError;
};

describe('CardWelcomeCardsAnimation', () => {
  const style = { width: 320 };

  beforeEach(() => {
    jest.clearAllMocks();
    __clearLastMockedMethods();
  });

  it('exports the CardsIn timeline duration', () => {
    expect(CARDS_IN_DURATION_MS).toBe(783);
  });

  it('uses the contract testID for the Rive animation', () => {
    expect(CardWelcomeSelectors.CARDS_ANIMATION).toBe(
      'card-welcome-cards-rive',
    );
  });

  it('renders the Rive animation and no static image when animate is true', () => {
    const { getByTestId, queryByTestId } = render(
      <CardWelcomeCardsAnimation animate style={style} />,
    );

    expect(getByTestId(CardWelcomeSelectors.CARDS_ANIMATION)).toBeTruthy();
    expect(queryByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeNull();
  });

  it('renders the static image and no Rive animation when animate is false', () => {
    const { getByTestId, queryByTestId } = render(
      <CardWelcomeCardsAnimation animate={false} style={style} />,
    );

    expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeTruthy();
    expect(queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION)).toBeNull();
  });

  it('passes the style prop through to the Rive animation', () => {
    const { getByTestId } = render(
      <CardWelcomeCardsAnimation animate style={style} />,
    );

    const flattenedStyle = StyleSheet.flatten(
      getByTestId(CardWelcomeSelectors.CARDS_ANIMATION).props.style,
    );

    expect(flattenedStyle).toEqual(expect.objectContaining(style));
  });

  it('passes the style prop through to the static image', () => {
    const { getByTestId } = render(
      <CardWelcomeCardsAnimation animate={false} style={style} />,
    );

    const flattenedStyle = StyleSheet.flatten(
      getByTestId(CardWelcomeSelectors.CARD_IMAGE).props.style,
    );

    expect(flattenedStyle).toEqual(expect.objectContaining(style));
  });

  it('falls back to the static image when the Rive animation errors', () => {
    const { getByTestId, queryByTestId } = render(
      <CardWelcomeCardsAnimation animate style={style} />,
    );

    expect(getByTestId(CardWelcomeSelectors.CARDS_ANIMATION)).toBeTruthy();

    const onError = getRiveOnError();
    expect(onError).toBeDefined();

    act(() => {
      onError?.({ message: 'failed to load', type: 'MalformedFile' });
    });

    expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeTruthy();
    expect(queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION)).toBeNull();
  });

  it('calls onRiveError when the Rive animation errors', () => {
    const onRiveError = jest.fn();
    render(
      <CardWelcomeCardsAnimation
        animate
        style={style}
        onRiveError={onRiveError}
      />,
    );

    const onError = getRiveOnError();
    expect(onError).toBeDefined();

    act(() => {
      onError?.({ message: 'failed to load', type: 'MalformedFile' });
    });

    expect(onRiveError).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the Rive animation errors and onRiveError is omitted', () => {
    const { getByTestId } = render(
      <CardWelcomeCardsAnimation animate style={style} />,
    );

    const onError = getRiveOnError();
    expect(onError).toBeDefined();

    expect(() => {
      act(() => {
        onError?.({ message: 'failed to load', type: 'MalformedFile' });
      });
    }).not.toThrow();

    expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeTruthy();
  });
});
