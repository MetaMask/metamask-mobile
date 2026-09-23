import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { CardSDKProvider, type ICardSDK } from '../../sdk';
import type { CardSDK } from '../../sdk/CardSDK';
import ContactDetails from './ContactDetails';
import { ContactDetailsSelectors } from './ContactDetails.testIds';

const mockGetContactDetails = jest.mocked(
  Engine.context.CardController.getContactDetails,
);
const mockPatchContactDetails = jest.mocked(
  Engine.context.CardController.patchContactDetails,
);

const cardSdkContext: ICardSDK = {
  sdk: {
    getRegistrationSettings: jest.fn().mockResolvedValue({
      countries: [
        {
          id: 'gb',
          name: 'United Kingdom',
          iso3166alpha2: 'GB',
          callingCode: '44',
          canSignUp: true,
        },
      ],
    }),
  } as unknown as CardSDK,
  isLoading: false,
  user: null,
  setUser: jest.fn(),
  logoutFromProvider: jest.fn().mockResolvedValue(undefined),
  fetchUserData: jest.fn().mockResolvedValue(undefined),
  isReturningSession: false,
};

const ContactDetailsWithCardSDK = () => (
  <CardSDKProvider value={cardSdkContext}>
    <ContactDetails />
  </CardSDKProvider>
);

describe('ContactDetails view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContactDetails.mockResolvedValue({
      email: 'old@example.com',
      phone: '+441234567890',
    });
    mockPatchContactDetails.mockResolvedValue(undefined);
  });

  it('loads current values and submits valid updates', async () => {
    const { findByTestId, getByTestId } = renderComponentViewScreen(
      ContactDetailsWithCardSDK,
      { name: Routes.CARD.CONTACT_DETAILS },
      {
        state: {
          engine: {
            backgroundState: {
              CardController: {
                cardHomeData: {
                  card: { regionCode: 'GB' },
                },
              },
            },
          },
        },
      },
    );

    const emailInput = await findByTestId(ContactDetailsSelectors.EMAIL_INPUT);
    const phoneInput = getByTestId(ContactDetailsSelectors.PHONE_NUMBER_INPUT);
    expect(emailInput).toHaveProp('value', 'old@example.com');
    expect(phoneInput).toHaveProp('value', '1234567890');

    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.changeText(phoneInput, '9876543210');
    fireEvent.press(getByTestId(ContactDetailsSelectors.SAVE_BUTTON));

    await waitFor(() => {
      expect(mockPatchContactDetails).toHaveBeenCalledWith({
        email: 'new@example.com',
        phone: '+449876543210',
      });
    });
  });
});
