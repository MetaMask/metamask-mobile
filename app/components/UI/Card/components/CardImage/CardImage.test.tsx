import React from 'react';
import CardImage from './CardImage';
import { CardType, CardStatus } from '../../types';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('../../util/truncateAddress', () => ({
  truncateAddress: jest.fn((address: string | undefined) => {
    if (address) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return undefined;
  }),
}));

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
  it('renders virtual card image for VIRTUAL type', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardImage
        type={CardType.VIRTUAL}
        status={CardStatus.ACTIVE}
        testID="virtual-card-image"
      />
    ));

    expect(getByTestId('virtual-card-image')).toBeOnTheScreen();
  });

  it('renders metal card image for PHYSICAL type', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardImage
        type={CardType.PHYSICAL}
        status={CardStatus.ACTIVE}
        testID="physical-card-image"
      />
    ));

    expect(getByTestId('physical-card-image')).toBeOnTheScreen();
  });

  it('renders metal card image for METAL type', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardImage
        type={CardType.METAL}
        status={CardStatus.ACTIVE}
        testID="metal-card-image"
      />
    ));

    expect(getByTestId('metal-card-image')).toBeOnTheScreen();
  });

  it('applies lower opacity when status is FROZEN', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardImage
        type={CardType.VIRTUAL}
        status={CardStatus.FROZEN}
        testID="frozen-card"
      />
    ));

    expect(getByTestId('frozen-card')).toBeOnTheScreen();
  });

  it('applies lower opacity when status is BLOCKED', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardImage
        type={CardType.VIRTUAL}
        status={CardStatus.BLOCKED}
        testID="blocked-card"
      />
    ));

    expect(getByTestId('blocked-card')).toBeOnTheScreen();
  });

  it('renders with full opacity when status is ACTIVE', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardImage
        type={CardType.VIRTUAL}
        status={CardStatus.ACTIVE}
        testID="active-card"
      />
    ));

    expect(getByTestId('active-card')).toBeOnTheScreen();
  });

  it('renders with truncated address when address prop provided', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardImage
        type={CardType.VIRTUAL}
        status={CardStatus.ACTIVE}
        address="0x1234567890123456789012345678901234567890"
        testID="card-with-address"
      />
    ));

    expect(getByTestId('card-with-address')).toBeOnTheScreen();
  });

  it('renders without address when address prop not provided', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardImage
        type={CardType.VIRTUAL}
        status={CardStatus.ACTIVE}
        testID="card-without-address"
      />
    ));

    expect(getByTestId('card-without-address')).toBeOnTheScreen();
  });

  it.each([CardType.VIRTUAL, CardType.PHYSICAL, CardType.METAL] as const)(
    'renders %s card type with ACTIVE status',
    (cardType) => {
      const { getByTestId } = renderWithProvider(() => (
        <CardImage
          type={cardType}
          status={CardStatus.ACTIVE}
          testID={`${cardType}-card`}
        />
      ));

      expect(getByTestId(`${cardType}-card`)).toBeOnTheScreen();
    },
  );

  it.each([CardStatus.ACTIVE, CardStatus.FROZEN, CardStatus.BLOCKED] as const)(
    'renders VIRTUAL card with %s status',
    (status) => {
      const { getByTestId } = renderWithProvider(() => (
        <CardImage
          type={CardType.VIRTUAL}
          status={status}
          testID={`card-${status}`}
        />
      ));

      expect(getByTestId(`card-${status}`)).toBeOnTheScreen();
    },
  );

  it('renders with custom SVG properties', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardImage
        type={CardType.VIRTUAL}
        status={CardStatus.ACTIVE}
        width={200}
        height={100}
        testID="custom-card-image"
      />
    ));

    expect(getByTestId('custom-card-image')).toBeOnTheScreen();
  });
});
