import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';

import ProfileRow from './ProfileRow';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const TEST_ID = 'profile-row';

describe('ProfileRow', () => {
  it('calls onPress when interactive', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <ProfileRow
        title="Handle"
        value="giga-whale"
        onPress={onPress}
        testID={TEST_ID}
      />,
    );

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  describe('when disabled', () => {
    it('is not pressable even when onPress is provided', () => {
      const { getByTestId } = renderWithProvider(
        <ProfileRow
          title="Handle"
          value="giga-whale"
          onPress={jest.fn()}
          disabled
          testID={TEST_ID}
        />,
      );

      // A non-interactive row renders a plain view: no button role and no
      // onPress handler on the host element. (fireEvent.press is not usable
      // here because it would find the composite ProfileRow's own onPress prop.)
      const row = getByTestId(TEST_ID);
      expect(row.props.accessibilityRole).toBeUndefined();
      expect(row.props.onPress).toBeUndefined();
      expect(row.props.onClick).toBeUndefined();
    });

    it('is announced as disabled', () => {
      const { getByTestId } = renderWithProvider(
        <ProfileRow
          title="Handle"
          value="giga-whale"
          disabled
          testID={TEST_ID}
        />,
      );

      expect(getByTestId(TEST_ID).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('still renders the label and value', () => {
      const { getByTestId } = renderWithProvider(
        <ProfileRow
          title="Handle"
          value="giga-whale"
          disabled
          testID={TEST_ID}
        />,
      );

      const row = getByTestId(TEST_ID);
      expect(within(row).getByText('Handle')).toBeOnTheScreen();
      expect(within(row).getByText('giga-whale')).toBeOnTheScreen();
    });
  });
});
