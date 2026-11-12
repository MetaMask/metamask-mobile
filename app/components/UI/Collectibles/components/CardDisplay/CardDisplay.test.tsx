import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { CollectiblesCardDisplayTestIds } from '../../Collectibles.testIds';
import { createCard } from '../../views/testUtils';
import CardDisplay from './CardDisplay';
import { getCardTitle, getGradeLabel, getRarityLabel } from './cardLabels';

describe('CardDisplay', () => {
  it.each([undefined, '', '   '])(
    'uses the API name when Set metadata is missing or empty (%s)',
    (set) => {
      const card = createCard({ set });

      const title = getCardTitle(card);

      expect(title).toBe(card.name);
    },
  );

  it('renders the card details, grading and metadata sections', () => {
    const owner = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
    const card = createCard({
      year: '1999',
      category: 'Pokemon',
      set: 'Base Set',
      gradingId: '120095975',
    });

    renderWithProvider(
      <CardDisplay card={card} owner={owner} variant="info" />,
    );

    fireEvent.press(
      screen.getByTestId(
        CollectiblesCardDisplayTestIds.SECTION_TOGGLE(
          CollectiblesCardDisplayTestIds.DETAILS,
        ),
      ),
    );
    fireEvent.press(
      screen.getByTestId(
        CollectiblesCardDisplayTestIds.SECTION_TOGGLE(
          CollectiblesCardDisplayTestIds.METADATA,
        ),
      ),
    );

    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.NAME),
    ).toHaveTextContent('Base Set');
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.GRADE),
    ).toHaveTextContent('GEM-MT 10');
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.RARITY),
    ).toHaveTextContent(strings('collectibles.rarity.rare'));
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.VALUE),
    ).toHaveTextContent(/^\$120$/u);
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.OWNER),
    ).toHaveTextContent(owner);
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.YEAR),
    ).toHaveTextContent('1999');
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.GRADING_COMPANY),
    ).toHaveTextContent('PSA');
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.GRADING_ID),
    ).toHaveTextContent('120095975');
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.COLLECTION),
    ).toHaveTextContent('Pokemon');
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.SET),
    ).toHaveTextContent('Base Set');
  });

  it('keeps the reveal focused on the card, tags and value', () => {
    const card = createCard({ year: '1999', category: 'Pokemon' });

    renderWithProvider(<CardDisplay card={card} variant="reveal" />);

    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.GRADE),
    ).toHaveTextContent('PSA 10');
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.RARITY),
    ).toHaveTextContent(strings('collectibles.rarity.rare'));
    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.VALUE),
    ).toHaveTextContent(/^\$120$/u);
    expect(
      screen.queryByTestId(CollectiblesCardDisplayTestIds.DETAILS),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardDisplayTestIds.GRADING),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardDisplayTestIds.METADATA),
    ).not.toBeOnTheScreen();
  });

  it('shows the insured value as USD with its cents', () => {
    const card = createCard({ insuredValue: 1234.56 });

    renderWithProvider(<CardDisplay card={card} />);

    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.VALUE),
    ).toHaveTextContent(/^\$1,234\.56$/u);
    expect(
      screen.getByText(strings('collectibles.card.insured_value')),
    ).toBeOnTheScreen();
  });

  it('shows a higher listing price and identifies it as an asking price', () => {
    renderWithProvider(
      <CardDisplay card={createCard({ listedPriceUsd: 150 })} />,
    );

    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.VALUE),
    ).toHaveTextContent(/^\$150$/u);
    expect(
      screen.getByText(strings('collectibles.card.asking_price')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('collectibles.card.insured_value')),
    ).not.toBeOnTheScreen();
  });

  it('shows the buyback amount separately from the card valuation in its information', () => {
    renderWithProvider(
      <CardDisplay
        card={createCard({
          buyback: { status: 'available', amount: '102000000' },
        })}
        variant="info"
      />,
    );

    expect(
      screen.getByTestId(CollectiblesCardDisplayTestIds.VALUE),
    ).toHaveTextContent('$120');
    expect(
      screen.getByText(strings('collectibles.reveal.buyback_offer')),
    ).toBeOnTheScreen();
    expect(screen.getByText('102.00')).toBeOnTheScreen();
  });

  it('does not present an active sale as an available buyback', () => {
    renderWithProvider(
      <CardDisplay
        card={createCard({
          buyback: { status: 'available', amount: '102000000' },
          sale: { status: 'pending', amount: '102000000', updatedAt: 1 },
        })}
        variant="info"
      />,
    );

    expect(
      screen.queryByText(strings('collectibles.reveal.buyback_offer')),
    ).not.toBeOnTheScreen();
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
      screen.queryByTestId(CollectiblesCardDisplayTestIds.GRADE),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardDisplayTestIds.RARITY),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardDisplayTestIds.VALUE),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardDisplayTestIds.DETAILS),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardDisplayTestIds.GRADING),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardDisplayTestIds.METADATA),
    ).not.toBeOnTheScreen();
  });
});

describe('cardLabels', () => {
  it('localizes rarities', () => {
    expect(getRarityLabel('epic')).toBe(strings('collectibles.rarity.epic'));
  });

  it('joins the grading company and the grade', () => {
    expect(getGradeLabel({ gradingCompany: 'PSA', grade: '10' })).toBe(
      'PSA 10',
    );
    expect(getGradeLabel({ gradingCompany: ' ', grade: '9' })).toBe('9');
    expect(getGradeLabel({})).toBeUndefined();
  });
});
