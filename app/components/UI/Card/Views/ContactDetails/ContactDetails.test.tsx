import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { setOnValueChange } from '../../components/Onboarding/RegionSelectorModal';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../util/test/analyticsMock';
import { ToastContext } from '../../../../../component-library/components/Toast';
import type { ToastRef } from '../../../../../component-library/components/Toast/Toast.types';
import useRegions from '../../hooks/useRegions';
import ContactDetails from './ContactDetails';
import { ContactDetailsSelectors } from './ContactDetails.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  addSensitiveProperties: jest.fn().mockReturnThis(),
  removeProperties: jest.fn().mockReturnThis(),
  removeSensitiveProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({
    name: 'mock-event',
    properties: {},
    sensitiveProperties: {},
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        getContactDetails: jest.fn(),
        patchContactDetails: jest.fn(),
      },
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../hooks/useRegions');
jest.mock('../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../hooks/useCardHeaderHandlers', () => ({
  useCardHeaderHandlers: () => ({ onBack: mockGoBack }),
}));

jest.mock('../../components/Onboarding/RegionSelectorModal', () => ({
  clearOnValueChange: jest.fn(),
  createRegionSelectorModalNavigationDetails: jest.fn(() => [
    'CardModals',
    { screen: 'RegionSelection' },
  ]),
  setOnValueChange: jest.fn(),
}));

const mockGetContactDetails = jest.mocked(
  Engine.context.CardController.getContactDetails,
);
const mockPatchContactDetails = jest.mocked(
  Engine.context.CardController.patchContactDetails,
);
const mockUseRegions = jest.mocked(useRegions);

const REGIONS = [
  {
    key: 'GB',
    name: 'United Kingdom',
    emoji: '🇬🇧',
    areaCode: '44',
    canSignUp: true,
  },
];

function renderContactDetails() {
  return renderWithProvider(
    <ToastContext.Provider
      value={{
        toastRef: {
          current: {
            showToast: mockShowToast,
            closeToast: jest.fn(),
          } as ToastRef,
        },
      }}
    >
      <ContactDetails />
    </ToastContext.Provider>,
    {
      state: {
        engine: {
          backgroundState: {
            CardController: {
              activeProviderId: 'immersve',
              cardHomeData: {
                card: { regionCode: 'GB' },
              },
            },
          },
        },
      },
    },
  );
}

describe('ContactDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContactDetails.mockResolvedValue({
      email: 'old@example.com',
      phone: '+441234567890',
    });
    mockPatchContactDetails.mockResolvedValue(undefined);
    mockUseRegions.mockReturnValue({
      allRegions: REGIONS,
      signUpRegions: REGIONS,
      regionsByCode: new Map(REGIONS.map((region) => [region.key, region])),
      getRegionByCode: (code) =>
        REGIONS.find((region) => region.key === code) ?? null,
      userCountry: null,
      userNationality: null,
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(null),
    });
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  it('prefills current contact details and saves normalized updates', async () => {
    const { findByTestId, getByTestId } = renderContactDetails();
    const emailInput = await findByTestId(ContactDetailsSelectors.EMAIL_INPUT);
    const phoneInput = getByTestId(ContactDetailsSelectors.PHONE_NUMBER_INPUT);

    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.changeText(phoneInput, '987 654 3210');
    fireEvent.press(getByTestId(ContactDetailsSelectors.SAVE_BUTTON));

    await waitFor(() => {
      expect(mockPatchContactDetails).toHaveBeenCalledWith({
        email: 'new@example.com',
        phone: '+449876543210',
      });
    });
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: 'immersve',
      action: 'CONTACT_DETAILS_SAVE_BUTTON',
      status: 'succeeded',
    });
  });

  it('shows validation errors without submitting malformed values', async () => {
    const { findByTestId, getByTestId } = renderContactDetails();
    const emailInput = await findByTestId(ContactDetailsSelectors.EMAIL_INPUT);
    const phoneInput = getByTestId(ContactDetailsSelectors.PHONE_NUMBER_INPUT);

    fireEvent.changeText(emailInput, 'not-an-email');
    fireEvent(emailInput, 'blur');
    fireEvent.changeText(phoneInput, '123');
    fireEvent(phoneInput, 'blur');

    expect(getByTestId(ContactDetailsSelectors.EMAIL_ERROR)).toBeOnTheScreen();
    expect(getByTestId(ContactDetailsSelectors.PHONE_ERROR)).toBeOnTheScreen();
    expect(mockPatchContactDetails).not.toHaveBeenCalled();
  });

  it('does not prefix or resubmit a stored phone with an unmatched region', async () => {
    mockGetContactDetails.mockResolvedValueOnce({
      email: 'old@example.com',
      phone: '+999123456',
    });
    const { findByTestId, getByTestId } = renderContactDetails();
    const emailInput = await findByTestId(ContactDetailsSelectors.EMAIL_INPUT);
    const phoneInput = getByTestId(ContactDetailsSelectors.PHONE_NUMBER_INPUT);

    expect(phoneInput).toHaveProp('value', '999123456');
    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.press(getByTestId(ContactDetailsSelectors.SAVE_BUTTON));

    await waitFor(() => {
      expect(mockPatchContactDetails).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
    });
  });

  it('does not send a prefixed phone after selecting a region for an unmatched stored number', async () => {
    mockGetContactDetails.mockResolvedValueOnce({
      email: 'old@example.com',
      phone: '+999123456',
    });
    const { findByTestId, getByTestId } = renderContactDetails();
    const emailInput = await findByTestId(ContactDetailsSelectors.EMAIL_INPUT);

    fireEvent.press(
      getByTestId(ContactDetailsSelectors.PHONE_AREA_CODE_SELECT),
    );
    const onRegionChange = jest.mocked(setOnValueChange).mock.calls.at(-1)?.[0];
    expect(onRegionChange).toBeDefined();
    act(() => {
      onRegionChange?.(REGIONS[0]);
    });
    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.press(getByTestId(ContactDetailsSelectors.SAVE_BUTTON));

    await waitFor(() => {
      expect(mockPatchContactDetails).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
    });
  });

  it('preserves edits and shows an inline error when the update fails', async () => {
    mockPatchContactDetails.mockRejectedValueOnce(new Error('update failed'));
    const { findByTestId, getByTestId, findByDisplayValue } =
      renderContactDetails();
    const emailInput = await findByTestId(ContactDetailsSelectors.EMAIL_INPUT);

    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.press(getByTestId(ContactDetailsSelectors.SAVE_BUTTON));

    expect(
      await findByTestId(ContactDetailsSelectors.SUBMIT_ERROR),
    ).toBeOnTheScreen();
    expect(await findByDisplayValue('new@example.com')).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: 'immersve',
      action: 'CONTACT_DETAILS_SAVE_BUTTON',
      status: 'failed',
    });
  });

  it('retries loading contact details after a fetch failure', async () => {
    mockGetContactDetails
      .mockRejectedValueOnce(new Error('load failed'))
      .mockResolvedValueOnce({
        email: 'old@example.com',
        phone: '+441234567890',
      });
    const { findByTestId } = renderContactDetails();

    fireEvent.press(await findByTestId(ContactDetailsSelectors.RETRY_BUTTON));

    expect(
      await findByTestId(ContactDetailsSelectors.EMAIL_INPUT),
    ).toBeOnTheScreen();
    expect(mockGetContactDetails).toHaveBeenCalledTimes(2);
  });
});
