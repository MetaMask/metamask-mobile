import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor, TextVariant } from '@metamask/design-system-react-native';
import InlineTextFlow from './InlineTextFlow';

describe('InlineTextFlow', () => {
  it('renders each word as a separate text item', () => {
    const { getByText } = render(
      <InlineTextFlow
        text="in assets to your"
        keyPrefix="middle"
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
      />,
    );

    expect(getByText('in')).toBeOnTheScreen();
    expect(getByText('assets')).toBeOnTheScreen();
    expect(getByText('to')).toBeOnTheScreen();
    expect(getByText('your')).toBeOnTheScreen();
  });

  it('renders leading separation without changing word content', () => {
    const { getByText } = render(
      <InlineTextFlow text="in one year." keyPrefix="suffix" leadingSpace />,
    );

    expect(getByText('in')).toBeOnTheScreen();
    expect(getByText('one')).toBeOnTheScreen();
    expect(getByText('year.')).toBeOnTheScreen();
  });
});
