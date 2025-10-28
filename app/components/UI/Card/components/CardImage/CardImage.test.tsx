import React from 'react';
import CardImage from './CardImage';
import { CardType } from '../../types';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'CardImage',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('CardImage Component', () => {
  it('renders virtual card image when type is VIRTUAL', () => {
    const { toJSON, getByTestId } = renderWithProvider(() => (
      <CardImage type={CardType.VIRTUAL} testID="virtual-card-image" />
    ));

    expect(getByTestId('virtual-card-image')).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders metal card image when type is PHYSICAL', () => {
    const { toJSON, getByTestId } = renderWithProvider(() => (
      <CardImage type={CardType.PHYSICAL} testID="physical-card-image" />
    ));

    expect(getByTestId('physical-card-image')).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders metal card image when type is METAL', () => {
    const { toJSON, getByTestId } = renderWithProvider(() => (
      <CardImage type={CardType.METAL} testID="metal-card-image" />
    ));

    expect(getByTestId('metal-card-image')).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with custom SVG properties', () => {
    const { toJSON } = renderWithProvider(() => (
      <CardImage
        type={CardType.VIRTUAL}
        width={200}
        height={100}
        fill="red"
        stroke="blue"
        opacity={0.5}
        testID="custom-card-image"
      />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it.each([CardType.VIRTUAL, CardType.PHYSICAL, CardType.METAL] as const)(
    'renders %s card type without errors',
    (cardType) => {
      const { toJSON } = renderWithProvider(() => (
        <CardImage type={cardType} />
      ));

      expect(toJSON()).toBeDefined();
    },
  );
});
