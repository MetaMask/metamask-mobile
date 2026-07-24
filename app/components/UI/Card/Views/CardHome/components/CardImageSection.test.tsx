import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CardImageSection from './CardImageSection';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType } from '../../../types';
import {
  CardStatus,
  type CardSensitiveDetails,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('../../../components/CardImage', () => {
  const { View } = jest.requireActual('react-native');
  return (props: { testID?: string }) => (
    <View testID={props.testID ?? 'card-image'} />
  );
});

const SENSITIVE_DETAILS: CardSensitiveDetails = {
  pan: '1234123412345678',
  cvv2: '321',
  expiry: '202501',
  embossedName: 'DOE/JOHN',
};

const baseProps = {
  isLoading: false,
  isCardDetailsLoading: false,
  cardDetailsImageUrl: null,
  isCardDetailsImageLoading: false,
  onImageLoad: jest.fn(),
  onImageError: jest.fn(),
  cardType: CardType.VIRTUAL,
  cardStatus: CardStatus.ACTIVE,
  walletAddress: undefined,
};

describe('CardImageSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the card artwork when no details are present', () => {
    const { getByTestId, queryByTestId } = render(
      <CardImageSection {...baseProps} />,
    );

    expect(getByTestId('card-image')).toBeOnTheScreen();
    expect(queryByTestId(CardHomeSelectors.CARD_SENSITIVE_DETAILS)).toBeNull();
  });

  it('renders formatted sensitive details when provided', () => {
    const { getByTestId } = render(
      <CardImageSection
        {...baseProps}
        cardSensitiveDetails={SENSITIVE_DETAILS}
        onCopyDetail={jest.fn()}
      />,
    );

    expect(
      getByTestId(CardHomeSelectors.CARD_SENSITIVE_DETAILS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.CARD_SENSITIVE_DETAILS_PAN),
    ).toHaveTextContent('1234 1234 1234 5678');
    expect(
      getByTestId(CardHomeSelectors.CARD_SENSITIVE_DETAILS_EXPIRY),
    ).toHaveTextContent('01/25');
    expect(
      getByTestId(CardHomeSelectors.CARD_SENSITIVE_DETAILS_CVV),
    ).toHaveTextContent('321');
    expect(
      getByTestId(CardHomeSelectors.CARD_SENSITIVE_DETAILS_NAME),
    ).toHaveTextContent('DOE/JOHN');
  });

  it('copies the raw (unformatted) value when a copy icon is pressed', () => {
    const onCopyDetail = jest.fn();
    const { getByTestId } = render(
      <CardImageSection
        {...baseProps}
        cardSensitiveDetails={SENSITIVE_DETAILS}
        onCopyDetail={onCopyDetail}
      />,
    );

    fireEvent.press(
      getByTestId(
        `${CardHomeSelectors.CARD_SENSITIVE_DETAILS_COPY}-${CardHomeSelectors.CARD_SENSITIVE_DETAILS_PAN}`,
      ),
    );

    expect(onCopyDetail).toHaveBeenCalledWith('1234123412345678');
  });

  it('only exposes a copy affordance for the card number', () => {
    const { queryByTestId } = render(
      <CardImageSection
        {...baseProps}
        cardSensitiveDetails={SENSITIVE_DETAILS}
        onCopyDetail={jest.fn()}
      />,
    );

    expect(
      queryByTestId(
        `${CardHomeSelectors.CARD_SENSITIVE_DETAILS_COPY}-${CardHomeSelectors.CARD_SENSITIVE_DETAILS_PAN}`,
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(
        `${CardHomeSelectors.CARD_SENSITIVE_DETAILS_COPY}-${CardHomeSelectors.CARD_SENSITIVE_DETAILS_EXPIRY}`,
      ),
    ).toBeNull();
    expect(
      queryByTestId(
        `${CardHomeSelectors.CARD_SENSITIVE_DETAILS_COPY}-${CardHomeSelectors.CARD_SENSITIVE_DETAILS_CVV}`,
      ),
    ).toBeNull();
    expect(
      queryByTestId(
        `${CardHomeSelectors.CARD_SENSITIVE_DETAILS_COPY}-${CardHomeSelectors.CARD_SENSITIVE_DETAILS_NAME}`,
      ),
    ).toBeNull();
  });
});
