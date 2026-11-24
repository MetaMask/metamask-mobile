import { Linking } from 'react-native';
// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import KalshiPrototypeStatusCard from './KalshiPrototypeStatusCard';
import { KalshiPrototypeStatusCardSelectorsIDs } from './KalshiPrototypeStatusCard.testIds';
import { PROTOTYPE_COPY } from './prototypeConstants';

// The scanner Rive needs a navigator for its replay-on-focus; this test has
// none.
jest.mock(
  '../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardHeroAnimation',
  () => () => null,
);

const copyOf = <S extends keyof typeof PROTOTYPE_COPY.card>(
  state: S,
): (typeof PROTOTYPE_COPY.card)[S] => PROTOTYPE_COPY.card[state];

describe('KalshiPrototypeStatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the get-started copy as one pressable, dismissible row', () => {
    const onPress = jest.fn();
    const onClose = jest.fn();
    const copy = copyOf('getStarted');
    const { getByTestId, getByText } = render(
      <KalshiPrototypeStatusCard
        state="getStarted"
        onPress={onPress}
        onClose={onClose}
      />,
    );

    expect(getByText(copy.title)).toBeOnTheScreen();
    expect(getByText(copy.description)).toBeOnTheScreen();
    const row = getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CONTAINER);
    expect(row.props.accessibilityRole).toBe('button');
    expect(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.THUMBNAIL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
    fireEvent.press(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CLOSE_BUTTON),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the step-up row pressable, with the Rive thumbnail and no close', () => {
    const onPress = jest.fn();
    const onClose = jest.fn();
    const copy = copyOf('stepUp');
    const { getByTestId, getByText, queryByTestId } = render(
      <KalshiPrototypeStatusCard
        state="stepUp"
        onPress={onPress}
        onClose={onClose}
      />,
    );

    expect(getByText(copy.title)).toBeOnTheScreen();
    expect(
      queryByTestId(KalshiPrototypeStatusCardSelectorsIDs.CLOSE_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.THUMBNAIL),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CONTAINER),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders the verifying row static, with the Rive thumbnail and no close', () => {
    const onPress = jest.fn();
    const onClose = jest.fn();
    const copy = copyOf('verifying');
    const { getByTestId, getByText, queryByTestId } = render(
      <KalshiPrototypeStatusCard
        state="verifying"
        onPress={onPress}
        onClose={onClose}
      />,
    );

    expect(getByText(copy.title)).toBeOnTheScreen();
    expect(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.THUMBNAIL),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(KalshiPrototypeStatusCardSelectorsIDs.CLOSE_BUTTON),
    ).toBeNull();

    const row = getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CONTAINER);
    expect(row.props.accessibilityRole).toBeUndefined();
    fireEvent.press(row);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders the can-not-verify row with Learn more, dismissible, and opening support', () => {
    const onPress = jest.fn();
    const onClose = jest.fn();
    const copy = copyOf('cantVerify');
    const { getByTestId, getByText } = render(
      <KalshiPrototypeStatusCard
        state="cantVerify"
        onPress={onPress}
        onClose={onClose}
      />,
    );

    expect(getByText(copy.title)).toBeOnTheScreen();
    expect(getByText(copy.action)).toBeOnTheScreen();
    expect(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CLOSE_BUTTON),
    );
    expect(onClose).toHaveBeenCalledTimes(1);

    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    fireEvent.press(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CONTAINER),
    );
    expect(openURL).toHaveBeenCalledWith('https://support.metamask.io');
    expect(onPress).not.toHaveBeenCalled();
    openURL.mockRestore();
  });

  it('renders the verified row static and dismissible', () => {
    const onPress = jest.fn();
    const onClose = jest.fn();
    const copy = copyOf('verified');
    const { getByTestId, getByText, queryByTestId } = render(
      <KalshiPrototypeStatusCard
        state="verified"
        onPress={onPress}
        onClose={onClose}
      />,
    );

    expect(getByText(copy.title)).toBeOnTheScreen();
    expect(getByText(copy.description)).toBeOnTheScreen();
    const row = getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CONTAINER);
    expect(row.props.accessibilityRole).toBeUndefined();
    expect(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(KalshiPrototypeStatusCardSelectorsIDs.ACTION),
    ).toBeNull();

    fireEvent.press(
      getByTestId(KalshiPrototypeStatusCardSelectorsIDs.CLOSE_BUTTON),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
