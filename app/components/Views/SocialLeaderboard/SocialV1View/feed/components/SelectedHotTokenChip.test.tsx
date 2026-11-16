import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { mockHotToken } from '../mocks/socialV1HotTokens.mock';
import {
  getSocialV1HotTokenCloseTestId,
  getSocialV1HotTokenSelectedChipTestId,
} from './HotTokensCarousel.testIds';
import SelectedHotTokenChip, {
  type SelectedHotTokenChipProps,
} from './SelectedHotTokenChip';

const TOKEN = mockHotToken({ id: 'hot-nvda', label: 'NVIDIA' });

const renderChip = (props: Partial<SelectedHotTokenChipProps> = {}) => {
  const defaults: SelectedHotTokenChipProps = {
    token: TOKEN,
    dockKey: 1,
    originLeft: 160,
    animatesIn: true,
    isExiting: false,
    onPress: jest.fn(),
    onExited: jest.fn(),
  };
  const merged = { ...defaults, ...props };
  const utils = renderWithProvider(<SelectedHotTokenChip {...merged} />);
  return { ...utils, props: merged };
};

describe('SelectedHotTokenChip', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the token as a selected chip with a close icon', () => {
    renderChip();

    const chip = screen.getByTestId(
      getSocialV1HotTokenSelectedChipTestId(TOKEN.id),
    );
    expect(chip).toHaveTextContent('NVIDIA');
    expect(chip.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(
      screen.getByTestId(getSocialV1HotTokenCloseTestId(TOKEN.id)),
    ).toBeOnTheScreen();
  });

  it('passes the token to onPress', () => {
    const { props } = renderChip();

    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId(TOKEN.id)),
    );

    expect(props.onPress).toHaveBeenCalledWith(TOKEN);
  });

  it.each([
    ['flies in from its pill', { originLeft: 160 }],
    ['rises in without a pill to fly from', { originLeft: null }],
    ['starts docked when the rail mounts filtered', { animatesIn: false }],
    ['fades in place under Reduce Motion', { reduceMotion: true }],
  ])('%s', (_name, props) => {
    renderChip(props);

    act(() => {
      jest.runAllTimers();
    });

    expect(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId(TOKEN.id)),
    ).toBeOnTheScreen();
  });

  it.each([
    ['with motion', false],
    ['under Reduce Motion', true],
  ])('reports its exit once the leave animation ends %s', (_name, reduce) => {
    const onExited = jest.fn();
    const { rerender, props } = renderChip({ onExited, reduceMotion: reduce });

    rerender(<SelectedHotTokenChip {...props} isExiting />);
    act(() => {
      jest.runAllTimers();
    });

    expect(onExited).toHaveBeenCalledWith(props.dockKey);
  });
});
