import { ButtonIcon, IconColor } from '@metamask/design-system-react-native';
import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SocialTabFilterBar from './SocialTabFilterBar';

const renderBar = (isFilterActive = false) =>
  renderWithProvider(
    <SocialTabFilterBar
      filterTestID="tab-filters"
      isFilterActive={isFilterActive}
    >
      {null}
    </SocialTabFilterBar>,
  );

describe('SocialTabFilterBar', () => {
  it('fills an active filter button with icon-default and inverts the glyph', () => {
    renderBar(true);

    const button = screen.UNSAFE_getByType(ButtonIcon);
    expect(button.props.twClassName).toBe('rounded-full bg-icon-default');
    expect(button.props.iconProps.color).toBe(IconColor.IconInverse);
  });

  it('returns a cleared filter button to the muted fill and default glyph', () => {
    renderBar();

    const button = screen.UNSAFE_getByType(ButtonIcon);
    expect(button.props.twClassName).toBe('rounded-full bg-muted');
    expect(button.props.iconProps.color).toBe(IconColor.IconDefault);
  });
});
