import React from 'react';
import { useWindowDimensions } from 'react-native';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createCard } from '../../views/testUtils';
import CardSummary, { getCardSummaryHeight } from './CardSummary';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 3, fontScale: 1 })),
}));

describe('CardSummary layout', () => {
  it.each([
    { fontScale: 1, rowHeight: 24, summaryHeight: 58 },
    { fontScale: 2, rowHeight: 44, summaryHeight: 100 },
  ])(
    'keeps the metadata row at font scale $fontScale when metadata arrives',
    ({ fontScale, rowHeight, summaryHeight }) => {
      jest.mocked(useWindowDimensions).mockReturnValue({
        width: 390,
        height: 844,
        scale: 3,
        fontScale,
      });
      const card = createCard({ mint: 'metadata-card' });
      const { rerender } = renderWithProvider(
        <CardSummary
          card={{
            ...card,
            insuredValue: undefined,
            grade: undefined,
            gradingCompany: undefined,
          }}
          valueTestID="card-value"
        />,
      );
      const metadata = screen.getByTestId(
        'collectibles-card-metadata-metadata-card',
      );
      const initialStyle = metadata.props.style;
      expect(metadata).toHaveStyle({ minHeight: rowHeight });
      expect(screen.queryByTestId('card-value')).not.toBeOnTheScreen();

      rerender(<CardSummary card={card} valueTestID="card-value" />);

      expect(
        screen.getByTestId('collectibles-card-metadata-metadata-card').props
          .style,
      ).toEqual(initialStyle);
      expect(screen.getByTestId('card-value')).toHaveTextContent('$120');
      expect(screen.getByText('PSA 10')).toHaveProp('numberOfLines', 1);
      expect(getCardSummaryHeight(fontScale)).toBe(summaryHeight);
    },
  );
});
