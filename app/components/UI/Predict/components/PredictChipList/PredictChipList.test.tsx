import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictChipList, { calculateChipScrollX } from './PredictChipList';
import {
  PREDICT_CHIP_LIST_TEST_IDS,
  getPredictChipTestId,
  getPredictChipLabelTestId,
} from './PredictChipList.testIds';
import type { PredictChipItem } from './PredictChipList.types';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...classes: (string | boolean | undefined)[]) => ({
      testStyle: classes.filter(Boolean).join(' '),
    }),
  }),
}));

const createMockChips = (
  keys: string[] = ['game_lines', 'assists', 'points'],
): PredictChipItem[] =>
  keys.map((key) => ({
    key,
    label: key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  }));

describe('PredictChipList', () => {
  const mockOnChipSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when chips is empty', () => {
      const { toJSON } = render(
        <PredictChipList
          chips={[]}
          activeChipKey=""
          onChipSelect={mockOnChipSelect}
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders a chip for each item', () => {
      const chips = createMockChips();

      const { getByTestId } = render(
        <PredictChipList
          chips={chips}
          activeChipKey="game_lines"
          onChipSelect={mockOnChipSelect}
        />,
      );

      expect(getPredictChipTestId('game_lines')).toBe(
        'predict-chip-game_lines',
      );
      expect(getByTestId(getPredictChipTestId('game_lines'))).toBeOnTheScreen();
      expect(getByTestId(getPredictChipTestId('assists'))).toBeOnTheScreen();
      expect(getByTestId(getPredictChipTestId('points'))).toBeOnTheScreen();
    });

    it('renders the container with default testID', () => {
      const chips = createMockChips(['game_lines']);

      const { getByTestId } = render(
        <PredictChipList
          chips={chips}
          activeChipKey="game_lines"
          onChipSelect={mockOnChipSelect}
        />,
      );

      expect(
        getByTestId(PREDICT_CHIP_LIST_TEST_IDS.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the container with custom testID', () => {
      const chips = createMockChips(['game_lines']);

      const { getByTestId } = render(
        <PredictChipList
          chips={chips}
          activeChipKey="game_lines"
          onChipSelect={mockOnChipSelect}
          testID="custom-test-id"
        />,
      );

      expect(getByTestId('custom-test-id')).toBeOnTheScreen();
    });
  });

  describe('labels', () => {
    it('renders the label provided in each chip item', () => {
      const chips: PredictChipItem[] = [
        { key: 'a', label: 'Alpha' },
        { key: 'b', label: 'Beta' },
      ];

      const { getByText } = render(
        <PredictChipList
          chips={chips}
          activeChipKey="a"
          onChipSelect={mockOnChipSelect}
        />,
      );

      expect(getByText('Alpha')).toBeOnTheScreen();
      expect(getByText('Beta')).toBeOnTheScreen();
    });

    it('renders unique testIDs per chip label', () => {
      const chips: PredictChipItem[] = [
        { key: 'x', label: 'X Label' },
        { key: 'y', label: 'Y Label' },
      ];

      const { getByTestId } = render(
        <PredictChipList
          chips={chips}
          activeChipKey="x"
          onChipSelect={mockOnChipSelect}
        />,
      );

      expect(getByTestId(getPredictChipLabelTestId('x'))).toBeOnTheScreen();
      expect(getByTestId(getPredictChipLabelTestId('y'))).toBeOnTheScreen();
    });
  });

  describe('selection', () => {
    it('marks the active chip with accessibilityState selected', () => {
      const chips = createMockChips();

      const { getByTestId } = render(
        <PredictChipList
          chips={chips}
          activeChipKey="assists"
          onChipSelect={mockOnChipSelect}
        />,
      );

      const activeChip = getByTestId(getPredictChipTestId('assists'));
      const inactiveChip = getByTestId(getPredictChipTestId('game_lines'));

      expect(activeChip.props.accessibilityState).toEqual({ selected: true });
      expect(inactiveChip.props.accessibilityState).toEqual({
        selected: false,
      });
    });

    it('calls onChipSelect with the chip key when pressed', () => {
      const chips = createMockChips();

      const { getByTestId } = render(
        <PredictChipList
          chips={chips}
          activeChipKey="game_lines"
          onChipSelect={mockOnChipSelect}
        />,
      );

      fireEvent.press(getByTestId(getPredictChipTestId('points')));

      expect(mockOnChipSelect).toHaveBeenCalledTimes(1);
      expect(mockOnChipSelect).toHaveBeenCalledWith('points');
    });

    it('calls onChipSelect when pressing the already active chip', () => {
      const chips = createMockChips();

      const { getByTestId } = render(
        <PredictChipList
          chips={chips}
          activeChipKey="game_lines"
          onChipSelect={mockOnChipSelect}
        />,
      );

      fireEvent.press(getByTestId(getPredictChipTestId('game_lines')));

      expect(mockOnChipSelect).toHaveBeenCalledWith('game_lines');
    });
  });

  describe('single chip', () => {
    it('renders a single chip when only one item exists', () => {
      const chips: PredictChipItem[] = [{ key: 'only', label: 'Only Chip' }];

      const { getByTestId, getByText } = render(
        <PredictChipList
          chips={chips}
          activeChipKey="only"
          onChipSelect={mockOnChipSelect}
        />,
      );

      expect(getByTestId(getPredictChipTestId('only'))).toBeOnTheScreen();
      expect(getByText('Only Chip')).toBeOnTheScreen();
    });
  });
});

describe('calculateChipScrollX', () => {
  const VIEWPORT = 375;

  const buildLayouts = (
    entries: { x: number; width: number }[],
  ): Map<number, { x: number; width: number }> => {
    const map = new Map<number, { x: number; width: number }>();
    entries.forEach((entry, i) => map.set(i, entry));
    return map;
  };

  it('returns null when selected chip layout is missing', () => {
    const layouts = buildLayouts([]);

    const result = calculateChipScrollX(0, 1, layouts, VIEWPORT);

    expect(result).toBeNull();
  });

  it('returns null when adjacent chip layout is missing', () => {
    const layouts = buildLayouts([{ x: 16, width: 80 }]);
    layouts.delete(1);

    const result = calculateChipScrollX(0, 3, layouts, VIEWPORT);

    expect(result).toBeNull();
  });

  it('centers the range for a middle chip with neighbors', () => {
    const layouts = buildLayouts([
      { x: 16, width: 100 },
      { x: 124, width: 80 },
      { x: 212, width: 90 },
    ]);

    const result = calculateChipScrollX(1, 3, layouts, VIEWPORT);

    expect(result).not.toBeNull();
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('clamps scroll offset to 0 when range is near the start', () => {
    const layouts = buildLayouts([
      { x: 16, width: 80 },
      { x: 104, width: 80 },
      { x: 192, width: 80 },
    ]);

    const result = calculateChipScrollX(0, 3, layouts, VIEWPORT);

    expect(result).toBe(0);
  });

  it('uses first chip as left bound when selecting first chip', () => {
    const layouts = buildLayouts([
      { x: 16, width: 80 },
      { x: 104, width: 80 },
    ]);

    const result = calculateChipScrollX(0, 2, layouts, VIEWPORT);

    expect(result).toBe(0);
  });

  it('uses last chip as right bound when selecting last chip', () => {
    const layouts = buildLayouts([
      { x: 16, width: 80 },
      { x: 104, width: 80 },
      { x: 192, width: 80 },
      { x: 280, width: 80 },
      { x: 368, width: 80 },
    ]);

    const result = calculateChipScrollX(4, 5, layouts, VIEWPORT);

    expect(result).not.toBeNull();
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('centers selected chip when range exceeds viewport', () => {
    const layouts = buildLayouts([
      { x: 16, width: 200 },
      { x: 224, width: 200 },
      { x: 432, width: 200 },
    ]);

    const result = calculateChipScrollX(1, 3, layouts, 300);

    const expectedCenter = 224 + 200 / 2 - 300 / 2;
    expect(result).toBe(expectedCenter);
  });

  it('handles single chip list', () => {
    const layouts = buildLayouts([{ x: 16, width: 100 }]);

    const result = calculateChipScrollX(0, 1, layouts, VIEWPORT);

    expect(result).toBe(0);
  });
});
