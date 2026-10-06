import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import { SecurityStatKey } from '../SecurityTab.types';
import SecurityRowLabel from './SecurityRowLabel';

describe('SecurityRowLabel', () => {
  it('reports the row that was tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SecurityRowLabel
        rowKey={SecurityStatKey.TopTen}
        label="Top 10"
        onPress={onPress}
      />,
    );

    fireEvent.press(
      getByTestId(SecurityTabSelectors.rowLabel(SecurityStatKey.TopTen)),
    );

    expect(onPress).toHaveBeenCalledWith(SecurityStatKey.TopTen);
  });

  // The dotted underline is the only visual hint that the label is tappable,
  // and a screen reader cannot see it — so the accessibility label has to say
  // what the gesture does rather than just repeat the row name.
  it('announces the label as a button that explains the term', () => {
    const { getByLabelText } = render(
      <SecurityRowLabel
        rowKey={SecurityStatKey.PrimaryPool}
        label="Primary pool"
        onPress={jest.fn()}
      />,
    );

    expect(getByLabelText('What does Primary pool mean?')).toBeOnTheScreen();
  });

  it('renders the label text it is given', () => {
    const { getByText } = render(
      <SecurityRowLabel
        rowKey={SecurityStatKey.Created}
        label="Created"
        onPress={jest.fn()}
      />,
    );

    expect(getByText('Created')).toBeOnTheScreen();
  });
});
