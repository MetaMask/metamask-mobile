import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { OutcomeRow } from './OutcomeRow';

// Team colors come from the Venue, not design tokens.
const TEAM_COLOR = `#${'0085CA'}`;

describe('OutcomeRow', () => {
  it('composes a leading avatar, label, trailing value and price in order', () => {
    render(
      <OutcomeRow.Root testID="row">
        <Text>Avatar</Text>
        <OutcomeRow.Label label="Carolina" percent={36} color={TEAM_COLOR} />
        <OutcomeRow.Value>-7.5</OutcomeRow.Value>
        <OutcomeRow.Price
          price="36¢"
          color={TEAM_COLOR}
          isDisabled={false}
          onPress={jest.fn()}
        />
      </OutcomeRow.Root>,
    );

    expect(screen.getByTestId('row')).toHaveTextContent(
      'AvatarCarolina-7.536¢',
    );
  });

  describe('Label', () => {
    it('draws the chance line at the given width and color', () => {
      render(
        <OutcomeRow.Label
          label="Over"
          percent={48}
          color={TEAM_COLOR}
          lineTestID="line"
        />,
      );

      expect(screen.getByText('Over')).toBeOnTheScreen();
      expect(screen.getByTestId('line')).toHaveStyle({
        width: '48%',
        backgroundColor: TEAM_COLOR,
      });
    });

    it('omits the line without a chance', () => {
      render(
        <OutcomeRow.Label label="Over" color={TEAM_COLOR} lineTestID="line" />,
      );

      expect(screen.queryByTestId('line')).toBeNull();
    });
  });

  describe('Price', () => {
    it('shows the price in the row color and emits a press', () => {
      const onPress = jest.fn();
      render(
        <OutcomeRow.Price
          price="71¢"
          color={TEAM_COLOR}
          isDisabled={false}
          onPress={onPress}
          accessibilityLabel="Carolina, 71¢"
          testID="price"
        />,
      );

      expect(screen.getByText('71¢')).toHaveStyle({ color: TEAM_COLOR });
      fireEvent.press(screen.getByLabelText('Carolina, 71¢'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders as the design-system pill button', () => {
      render(
        <OutcomeRow.Price
          price="46¢"
          color={TEAM_COLOR}
          isDisabled={false}
          onPress={jest.fn()}
          testID="price"
        />,
      );

      expect(screen.getByTestId('price')).toHaveStyle({
        borderRadius: 9999,
        height: 48,
        minWidth: 64,
      });
    });

    it('shows a dash without a price', () => {
      render(
        <OutcomeRow.Price
          color={TEAM_COLOR}
          isDisabled
          onPress={jest.fn()}
          testID="price"
        />,
      );

      expect(screen.getByTestId('price')).toHaveTextContent('—');
    });

    it('does not emit a press while disabled', () => {
      const onPress = jest.fn();
      render(
        <OutcomeRow.Price
          price="71¢"
          color={TEAM_COLOR}
          isDisabled
          onPress={onPress}
          testID="price"
        />,
      );

      fireEvent.press(screen.getByTestId('price'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });
});
