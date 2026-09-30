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
  it('renders the name, grade, rarity and value', () => {
    renderWithProvider(<CardDisplay card={createCard()} />);

    expect(screen.getByTestId(GachaCardDisplayTestIds.NAME)).toHaveTextContent(
      'Charizard Holo',
    );
    expect(screen.getByTestId(GachaCardDisplayTestIds.GRADE)).toHaveTextContent(
      'PSA GEM-MT 10',
    );
    expect(
      screen.getByTestId(GachaCardDisplayTestIds.RARITY),
    ).toHaveTextContent('Rare');
    expect(screen.getByTestId(GachaCardDisplayTestIds.VALUE)).toHaveTextContent(
      '$120',
    );
  });

  it('omits the tags and the value when unknown', () => {
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
