import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsMarginModeTag from './PerpsMarginModeTag';

describe('PerpsMarginModeTag', () => {
  it.each([
    ['cross', 'Cross'],
    ['isolated', 'Isolated'],
  ] as const)('names %s margin', (marginMode, label) => {
    render(<PerpsMarginModeTag marginMode={marginMode} testID="margin-mode" />);

    expect(screen.getByTestId('margin-mode')).toHaveTextContent(label);
  });
});
