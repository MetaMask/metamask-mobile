import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent, within } from '@testing-library/react-native';
import CardImageSection from './CardImageSection';
import {
  HOSTED_CARD_CORNER_RADIUS_RATIO,
  HOSTED_CARD_DETAILS_ASPECT_RATIO,
} from '../../../components/CardSecureDetailsView/HostedCardDetailsPage';
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
  cardDetailsHostedPageUrl: null,
  isCardDetailsImageLoading: false,
  onImageLoad: jest.fn(),
  onImageError: jest.fn(),
  cardType: CardType.VIRTUAL,
  cardStatus: CardStatus.ACTIVE,
};

describe('CardImageSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shimmers the card image while loading', () => {
    const { getByTestId, queryByTestId } = render(
      <CardImageSection {...baseProps} isLoading />,
    );

    expect(
      getByTestId(CardHomeSelectors.CARD_IMAGE_SKELETON),
    ).toBeOnTheScreen();
    expect(queryByTestId('card-image')).toBeNull();
  });

  it('renders the card artwork when no details are present', () => {
    const { getByTestId, queryByTestId } = render(
      <CardImageSection {...baseProps} />,
    );

    expect(getByTestId('card-image')).toBeOnTheScreen();
    expect(queryByTestId(CardHomeSelectors.CARD_SENSITIVE_DETAILS)).toBeNull();
  });

  it('renders the hosted page under a skeleton while it loads', () => {
    const { getByTestId } = render(
      <CardImageSection
        {...baseProps}
        cardDetailsHostedPageUrl="https://cards.example/card/details?token=one"
        isCardDetailsImageLoading
      />,
    );

    expect(
      getByTestId(CardHomeSelectors.CARD_DETAILS_HOSTED_PAGE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON),
    ).toBeOnTheScreen();
  });

  it('renders the hosted page without a skeleton after it loads', () => {
    const { getByTestId, queryByTestId } = render(
      <CardImageSection
        {...baseProps}
        cardDetailsHostedPageUrl="https://cards.example/card/details?token=one"
      />,
    );
    const page = getByTestId(CardHomeSelectors.CARD_DETAILS_HOSTED_PAGE);

    const frame = getByTestId(CardHomeSelectors.CARD_DETAILS_HOSTED_PAGE_FRAME);

    expect(page).toBeOnTheScreen();
    expect(
      within(frame).getByTestId(CardHomeSelectors.CARD_DETAILS_HOSTED_PAGE),
    ).toBeOnTheScreen();
    expect(StyleSheet.flatten(frame.props.style)).toEqual(
      expect.objectContaining({
        flex: 0,
        width: '100%',
        aspectRatio: HOSTED_CARD_DETAILS_ASPECT_RATIO,
        overflow: 'hidden',
      }),
    );
    expect(StyleSheet.flatten(frame.props.style)?.borderRadius).toBeUndefined();

    fireEvent(frame, 'layout', {
      nativeEvent: { layout: { width: 340, height: 216 } },
    });

    expect(
      StyleSheet.flatten(
        getByTestId(CardHomeSelectors.CARD_DETAILS_HOSTED_PAGE_FRAME).props
          .style,
      )?.borderRadius,
    ).toBeCloseTo(340 * HOSTED_CARD_CORNER_RADIUS_RATIO);
    expect(
      queryByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON),
    ).toBeNull();
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
