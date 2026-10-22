import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Tag, TagSeverity, Text } from '@metamask/design-system-react-native';
import { colors } from '../../../../../styles/common';
import PerpsOrangeChip, {
  PERPS_ORANGE_TINT_CLASS_NAME,
} from './PerpsOrangeChip';

describe('PerpsOrangeChip', () => {
  it('shows the plan name in the Member badge orange', () => {
    render(<PerpsOrangeChip testID="orange-chip" />);

    expect(screen.getByTestId('orange-chip')).toHaveTextContent('Orange');
    const label = screen
      .UNSAFE_getAllByType(Text)
      .find((node) => node.props.children === 'Orange');
    expect(label?.props.style).toEqual(
      expect.objectContaining({ color: colors.rewardsMemberLabel }),
    );
  });

  it('keeps the Isolated chip shape with the orange tint', () => {
    render(<PerpsOrangeChip />);

    const tag = screen.UNSAFE_getByType(Tag);
    expect(tag.props.severity).toBe(TagSeverity.Neutral);
    expect(tag.props.twClassName).toBe(PERPS_ORANGE_TINT_CLASS_NAME);
  });
});
