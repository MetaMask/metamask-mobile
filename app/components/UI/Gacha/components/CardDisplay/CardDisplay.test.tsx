import React from 'react';
import { screen } from '@testing-library/react-native';
import { TagSeverity } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { GachaCardDisplayTestIds } from '../../Gacha.testIds';
import { createCard } from '../../views/testUtils';
import CardDisplay from './CardDisplay';
import {
  RARITY_TAG_SEVERITY,
  getGradeLabel,
  getRarityLabel,
} from './cardLabels';

describe('CardDisplay', () => {
  it('renders the card details, grading and metadata sections', () => {
    const owner = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
    const card = createCard({
      year: '1999',
      category: 'Pokemon',
      set: 'Base Set',
      gradingId: '120095975',
    });

    renderWithProvider(<CardDisplay card={card} owner={owner} />);

    expect(screen.getByTestId(GachaCardDisplayTestIds.NAME)).toHaveTextContent(
      'Charizard Holo',
    );
    expect(screen.getByTestId(GachaCardDisplayTestIds.GRADE)).toHaveTextContent(
      'GEM-MT 10',
    );
    expect(
      screen.getByTestId(GachaCardDisplayTestIds.RARITY),
    ).toHaveTextContent('Rare');
    expect(screen.getByTestId(GachaCardDisplayTestIds.VALUE)).toHaveTextContent(
      /^120$/u,
    );
    expect(screen.getByTestId(GachaCardDisplayTestIds.OWNER)).toHaveTextContent(
      owner,
    );
    expect(screen.getByTestId(GachaCardDisplayTestIds.YEAR)).toHaveTextContent(
      '1999',
    );
    expect(
      screen.getByTestId(GachaCardDisplayTestIds.GRADING_COMPANY),
    ).toHaveTextContent('PSA');
    expect(
      screen.getByTestId(GachaCardDisplayTestIds.GRADING_ID),
    ).toHaveTextContent('120095975');
    expect(
      screen.getByTestId(GachaCardDisplayTestIds.COLLECTION),
    ).toHaveTextContent('Pokemon');
    expect(screen.getByTestId(GachaCardDisplayTestIds.SET)).toHaveTextContent(
      'Base Set',
    );
  });

  it('keeps the reveal focused on the card, tags and value', () => {
    const card = createCard({ year: '1999', category: 'Pokemon' });

    renderWithProvider(<CardDisplay card={card} variant="reveal" />);

    expect(screen.getByTestId(GachaCardDisplayTestIds.GRADE)).toHaveTextContent(
      'PSA GEM-MT 10',
    );
    expect(
      screen.getByTestId(GachaCardDisplayTestIds.RARITY),
    ).toHaveTextContent('Rare');
    expect(screen.getByTestId(GachaCardDisplayTestIds.VALUE)).toHaveTextContent(
      /^120$/u,
    );
    expect(screen.queryByTestId(GachaCardDisplayTestIds.DETAILS)).toBeNull();
    expect(screen.queryByTestId(GachaCardDisplayTestIds.GRADING)).toBeNull();
    expect(screen.queryByTestId(GachaCardDisplayTestIds.METADATA)).toBeNull();
  });

  it('preserves the insured value decimals without a currency suffix', () => {
    const card = createCard({ insuredValue: 1234.56 });

    renderWithProvider(<CardDisplay card={card} />);

    expect(screen.getByTestId(GachaCardDisplayTestIds.VALUE)).toHaveTextContent(
      /^1,234\.56$/u,
    );
    expect(screen.getByText('Insured value')).toBeOnTheScreen();
  });

  it('shows a higher listing price and identifies it as an asking price', () => {
    renderWithProvider(
      <CardDisplay card={createCard({ listedPriceUsd: 150 })} />,
    );

    expect(screen.getByTestId(GachaCardDisplayTestIds.VALUE)).toHaveTextContent(
      /^150$/u,
    );
    expect(screen.getByText('Asking price')).toBeOnTheScreen();
    expect(screen.queryByText('Insured value')).toBeNull();
  });

  it('omits empty metadata sections and the unknown value', () => {
    renderWithProvider(
      <CardDisplay
        card={createCard({
          grade: undefined,
          gradingCompany: undefined,
          rarity: undefined,
          insuredValue: undefined,
        })}
      />,
    );

    expect(
      screen.queryByTestId(GachaCardDisplayTestIds.GRADE),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardDisplayTestIds.RARITY),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardDisplayTestIds.VALUE),
    ).not.toBeOnTheScreen();
    expect(screen.queryByTestId(GachaCardDisplayTestIds.DETAILS)).toBeNull();
    expect(screen.queryByTestId(GachaCardDisplayTestIds.GRADING)).toBeNull();
    expect(screen.queryByTestId(GachaCardDisplayTestIds.METADATA)).toBeNull();
  });
});

describe('cardLabels', () => {
  it('maps rarities to tag severities', () => {
    expect(RARITY_TAG_SEVERITY).toStrictEqual({
      common: TagSeverity.Neutral,
      uncommon: TagSeverity.Info,
      rare: TagSeverity.Warning,
      epic: TagSeverity.Success,
    });
  });

  it('localizes rarities', () => {
    expect(getRarityLabel('epic')).toBe('Epic');
  });

  it('joins the grading company and the grade', () => {
    expect(getGradeLabel({ gradingCompany: 'PSA', grade: '10' })).toBe(
      'PSA 10',
    );
    expect(getGradeLabel({ gradingCompany: ' ', grade: '9' })).toBe('9');
    expect(getGradeLabel({})).toBeUndefined();
  });
});
