import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import PredictSportTeamGradient from './PredictSportTeamGradient';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

describe('PredictSportTeamGradient', () => {
  describe('rendering', () => {
    it('renders gradient with team colors', () => {
      const awayColor = '#002244';
      const homeColor = '#FB4F14';

      const { getByTestId } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      expect(getByTestId('gradient')).toBeOnTheScreen();
    });

    it('renders gradient with NFL team colors', () => {
      const seattleBlue = '#002244';
      const seattleGreen = '#69BE28';

      const { getByTestId } = render(
        <PredictSportTeamGradient
          awayColor={seattleBlue}
          homeColor={seattleGreen}
          testID="gradient"
        />,
      );

      expect(getByTestId('gradient')).toBeOnTheScreen();
    });
  });

  describe('gradient colors', () => {
    it('applies 20% opacity to 6-character hex colors', () => {
      const awayColor = '#002244';
      const homeColor = '#FB4F14';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors).toEqual([
        'rgba(0, 34, 68, 0.2)',
        'rgba(251, 79, 20, 0.2)',
      ]);
    });

    it('applies 20% opacity to uppercase hex colors', () => {
      const awayColor = '#ABCDEF';
      const homeColor = '#123456';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors[0]).toBe('rgba(171, 205, 239, 0.2)');
      expect(gradients[0].props.colors[1]).toBe('rgba(18, 52, 86, 0.2)');
    });

    it('applies 20% opacity to 3-character hex colors', () => {
      const awayColor = '#F00';
      const homeColor = '#0F0';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors[0]).toBe('rgba(255, 0, 0, 0.2)');
      expect(gradients[0].props.colors[1]).toBe('rgba(0, 255, 0, 0.2)');
    });

    it('applies 20% opacity to 8-character hex colors with existing alpha', () => {
      const awayColor = '#002244FF';
      const homeColor = '#FB4F1480';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors[0]).toBe('rgba(0, 34, 68, 0.2)');
      expect(gradients[0].props.colors[1]).toBe('rgba(251, 79, 20, 0.2)');
    });

    it('applies 20% opacity to 4-character hex colors with existing alpha', () => {
      const awayColor = '#F00F';
      const homeColor = '#0F08';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors[0]).toBe('rgba(255, 0, 0, 0.2)');
      expect(gradients[0].props.colors[1]).toBe('rgba(0, 255, 0, 0.2)');
    });

    it('applies 20% opacity to RGB colors', () => {
      const awayColor = 'rgb(0, 34, 68)';
      const homeColor = 'rgb(251, 79, 20)';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors[0]).toBe('rgba(0, 34, 68, 0.2)');
      expect(gradients[0].props.colors[1]).toBe('rgba(251, 79, 20, 0.2)');
    });

    it('applies 20% opacity to RGBA colors replacing existing alpha', () => {
      const awayColor = 'rgba(0, 34, 68, 0.8)';
      const homeColor = 'rgba(251, 79, 20, 0.5)';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors[0]).toBe('rgba(0, 34, 68, 0.2)');
      expect(gradients[0].props.colors[1]).toBe('rgba(251, 79, 20, 0.2)');
    });
  });

  describe('gradient direction', () => {
    it('configures 45 degree gradient with diagonal direction', () => {
      const awayColor = '#002244';
      const homeColor = '#FB4F14';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);
      expect(gradients[0].props.start).toEqual({ x: 0, y: 0 });
      expect(gradients[0].props.end).toEqual({ x: 1, y: 1 });
    });
  });

  describe('children', () => {
    it('renders children inside gradient', () => {
      const childText = 'Game Content';

      const { getByText } = render(
        <PredictSportTeamGradient awayColor="#002244" homeColor="#FB4F14">
          <Text>{childText}</Text>
        </PredictSportTeamGradient>,
      );

      expect(getByText(childText)).toBeOnTheScreen();
    });

    it('renders multiple children inside gradient', () => {
      const { getByText } = render(
        <PredictSportTeamGradient awayColor="#002244" homeColor="#FB4F14">
          <Text>Team A</Text>
          <Text>Team B</Text>
          <Text>Score</Text>
        </PredictSportTeamGradient>,
      );

      expect(getByText('Team A')).toBeOnTheScreen();
      expect(getByText('Team B')).toBeOnTheScreen();
      expect(getByText('Score')).toBeOnTheScreen();
    });

    it('renders gradient without children', () => {
      const { getByTestId } = render(
        <PredictSportTeamGradient
          awayColor="#002244"
          homeColor="#FB4F14"
          testID="gradient"
        />,
      );

      expect(getByTestId('gradient')).toBeOnTheScreen();
    });
  });

  describe('style prop', () => {
    it('applies custom style prop', () => {
      const customStyle = { borderRadius: 12 };

      const { getByTestId } = render(
        <PredictSportTeamGradient
          awayColor="#002244"
          homeColor="#FB4F14"
          style={customStyle}
          testID="gradient"
        />,
      );

      const gradient = getByTestId('gradient');
      // Box component merges styles, check that borderRadius is present
      expect(gradient.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)]),
      );
    });

    it('merges custom style with default absolute positioning', () => {
      const customStyle = { opacity: 0.5 };

      const { getByTestId } = render(
        <PredictSportTeamGradient
          awayColor="#002244"
          homeColor="#FB4F14"
          style={customStyle}
          testID="gradient"
        />,
      );

      const gradient = getByTestId('gradient');
      expect(gradient.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)]),
      );
    });
  });

  describe('edge cases', () => {
    it('renders gradient with identical away and home colors', () => {
      const sameColor = '#002244';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={sameColor}
          homeColor={sameColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors).toEqual([
        'rgba(0, 34, 68, 0.2)',
        'rgba(0, 34, 68, 0.2)',
      ]);
    });

    it('renders gradient with 3-character hex colors', () => {
      const awayColor = '#FFF';
      const homeColor = '#000';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors).toEqual([
        'rgba(255, 255, 255, 0.2)',
        'rgba(0, 0, 0, 0.2)',
      ]);
    });

    it('renders gradient with lowercase hex colors', () => {
      const awayColor = '#abc123';
      const homeColor = '#def456';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors).toEqual([
        'rgba(171, 193, 35, 0.2)',
        'rgba(222, 244, 86, 0.2)',
      ]);
    });

    it('renders gradient with uppercase hex colors', () => {
      const awayColor = '#ABC123';
      const homeColor = '#DEF456';

      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);

      expect(gradients[0].props.colors).toEqual([
        'rgba(171, 193, 35, 0.2)',
        'rgba(222, 244, 86, 0.2)',
      ]);
    });
  });

  describe('positioning', () => {
    it('wraps content in relative positioned container', () => {
      const { getByTestId } = render(
        <PredictSportTeamGradient
          awayColor="#002244"
          homeColor="#FB4F14"
          testID="gradient"
        />,
      );

      const container = getByTestId('gradient');
      const styles = container.props.style;
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            position: 'relative',
          }),
        ]),
      );
    });

    it('positions gradient absolutely within container', () => {
      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamGradient
          awayColor="#002244"
          homeColor="#FB4F14"
          testID="gradient"
        >
          <Text>Content</Text>
        </PredictSportTeamGradient>,
      );

      const gradients = UNSAFE_getAllByType(LinearGradient);
      expect(gradients).toHaveLength(1);
    });
  });

  describe('memoization', () => {
    it('memoizes gradient colors when props remain unchanged', () => {
      const awayColor = '#002244';
      const homeColor = '#FB4F14';

      const { UNSAFE_getAllByType, rerender } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );
      const firstRenderColors =
        UNSAFE_getAllByType(LinearGradient)[0].props.colors;

      rerender(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor={homeColor}
          testID="gradient"
        />,
      );
      const secondRenderColors =
        UNSAFE_getAllByType(LinearGradient)[0].props.colors;

      expect(firstRenderColors).toBe(secondRenderColors);
    });

    it('recalculates gradient colors when away color changes', () => {
      const homeColor = '#FB4F14';

      const { UNSAFE_getAllByType, rerender } = render(
        <PredictSportTeamGradient
          awayColor="#002244"
          homeColor={homeColor}
          testID="gradient"
        />,
      );
      const firstRenderColors =
        UNSAFE_getAllByType(LinearGradient)[0].props.colors;

      rerender(
        <PredictSportTeamGradient
          awayColor="#123456"
          homeColor={homeColor}
          testID="gradient"
        />,
      );
      const secondRenderColors =
        UNSAFE_getAllByType(LinearGradient)[0].props.colors;

      expect(firstRenderColors).not.toBe(secondRenderColors);
      expect(secondRenderColors[0]).toBe('rgba(18, 52, 86, 0.2)');
    });

    it('recalculates gradient colors when home color changes', () => {
      const awayColor = '#002244';

      const { UNSAFE_getAllByType, rerender } = render(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor="#FB4F14"
          testID="gradient"
        />,
      );
      const firstRenderColors =
        UNSAFE_getAllByType(LinearGradient)[0].props.colors;

      rerender(
        <PredictSportTeamGradient
          awayColor={awayColor}
          homeColor="#789ABC"
          testID="gradient"
        />,
      );
      const secondRenderColors =
        UNSAFE_getAllByType(LinearGradient)[0].props.colors;

      expect(firstRenderColors).not.toBe(secondRenderColors);
      expect(secondRenderColors[1]).toBe('rgba(120, 154, 188, 0.2)');
    });
  });
});
