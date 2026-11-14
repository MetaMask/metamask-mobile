import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsMarginModeTag from './PerpsMarginModeTag';

describe('PerpsMarginModeTag', () => {
  it.each(['cross', 'isolated'] as const)('names %s margin', (marginMode) => {
    render(<PerpsMarginModeTag marginMode={marginMode} testID="margin-mode" />);

    expect(screen.getByTestId('margin-mode')).toHaveTextContent(
      strings(
        marginMode === 'cross'
          ? 'perps.margin_mode.cross_title'
          : 'perps.margin_mode.isolated_title',
      ),
    );
  });
});
