import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import PerpsMarginModeTag from './PerpsMarginModeTag';

describe('PerpsMarginModeTag', () => {
  it.each([
    ['cross', 'Cross'],
    ['isolated', 'Isolated'],
  ] as const)('names %s margin', (marginMode, label) => {
    render(<PerpsMarginModeTag marginMode={marginMode} testID="margin-mode" />);

    expect(screen.getByTestId('margin-mode')).toHaveTextContent(label);
  });

  it('shows the fallback while the mode is unresolved', () => {
    render(<PerpsMarginModeTag testID="margin-mode" />);

    expect(screen.getByTestId('margin-mode')).toHaveTextContent(
      PERPS_CONSTANTS.FallbackDataDisplay,
    );
    expect(screen.queryByText('Isolated')).not.toBeOnTheScreen();
    expect(screen.queryByText('Cross')).not.toBeOnTheScreen();
  });
});
