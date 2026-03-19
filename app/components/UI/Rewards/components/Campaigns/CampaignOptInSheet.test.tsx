import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignOptInSheet from './CampaignOptInSheet';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { useOptInToCampaign } from '../../hooks/useOptInToCampaign';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../hooks/useOptInToCampaign');
const mockUseOptInToCampaign = useOptInToCampaign as jest.MockedFunction<
  typeof useOptInToCampaign
>;

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        testID,
      }: {
        children?: React.ReactNode;
        testID?: string;
      }) => ReactActual.createElement(View, { testID }, children),
    };
  },
);

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      description,
      testID,
    }: {
      title: string;
      description: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: testID ?? 'error-banner' },
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(Text, null, description),
      ),
  };
});

jest.mock('../ContentfulRichText/ContentfulRichText', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');
  const isDocumentFn = (value: unknown): boolean =>
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in (value as Record<string, unknown>) &&
    (value as Record<string, unknown>).nodeType === 'document' &&
    'content' in (value as Record<string, unknown>) &&
    Array.isArray((value as Record<string, unknown>).content);
  return {
    __esModule: true,
    isDocument: isDocumentFn,
    default: ({
      document: doc,
      testID,
    }: {
      document: unknown;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(RNText, null, JSON.stringify(doc)),
      ),
  };
});

jest.mock('../Onboarding/constants', () => ({
  REWARDS_ONBOARD_TERMS_URL: 'https://go.metamask.io/rewards-terms',
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign.opt_in_sheet_title': 'Join Campaign',
      'rewards.campaign.opt_in_sheet_description_pre_link':
        'By joining you agree to the',
      'rewards.campaign.opt_in_sheet_link_text': 'Terms',
      'rewards.campaign.opt_in_sheet_description_post_link':
        'You can opt out at any time.',
      'rewards.campaign_details.opt_in_error': 'Failed to join campaign',
      'rewards.campaign.opt_in_cta': 'Join',
    };
    return translations[key] || key;
  },
}));

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2027-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  statusLabel: 'Active',
  details: null,
  ...overrides,
});

const mockOptInToCampaign = jest.fn();

describe('CampaignOptInSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptInToCampaign.mockReturnValue({
      optInToCampaign: mockOptInToCampaign,
      isOptingIn: false,
      optInError: undefined,
      clearOptInError: jest.fn(),
    });
  });

  it('renders the sheet title', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-sheet-title')).toHaveTextContent(
      'Join Campaign',
    );
  });

  it('renders the description container', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-sheet-description')).toBeDefined();
  });

  it('renders the terms link with correct text', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-sheet-terms-link')).toHaveTextContent(
      'Terms',
    );
  });

  it('opens the terms URL in in-app browser when terms link is pressed', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-sheet-terms-link'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: expect.objectContaining({
        newTabUrl: 'https://go.metamask.io/rewards-terms',
      }),
    });
  });

  it('renders the CTA button', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-cta')).toBeDefined();
  });

  it('calls optInToCampaign with the campaign id when CTA is pressed', () => {
    mockOptInToCampaign.mockResolvedValue({ optedIn: true });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-cta'));
    expect(mockOptInToCampaign).toHaveBeenCalledWith('campaign-1');
  });

  it('calls onClose after successful opt-in', async () => {
    const onClose = jest.fn();
    mockOptInToCampaign.mockResolvedValue({ optedIn: true });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-cta'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when opt-in throws', async () => {
    const onClose = jest.fn();
    mockOptInToCampaign.mockRejectedValue(new Error('API error'));
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-cta'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders the close button', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-sheet-close')).toBeDefined();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error banner when optInError is set', () => {
    mockUseOptInToCampaign.mockReturnValue({
      optInToCampaign: mockOptInToCampaign,
      isOptingIn: false,
      optInError: 'Something went wrong',
      clearOptInError: jest.fn(),
    });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-error-banner')).toBeDefined();
  });

  it('does not show error banner when there is no error', () => {
    const { queryByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(queryByTestId('campaign-opt-in-error-banner')).toBeNull();
  });

  it('shows loading state on the CTA while opting in', () => {
    mockUseOptInToCampaign.mockReturnValue({
      optInToCampaign: mockOptInToCampaign,
      isOptingIn: true,
      optInError: undefined,
      clearOptInError: jest.fn(),
    });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    // Button still renders while loading
    expect(getByTestId('campaign-opt-in-cta')).toBeDefined();
  });

  describe('termsAndConditions rich text', () => {
    const richTextDoc = {
      nodeType: 'document',
      data: {},
      content: [
        {
          nodeType: 'paragraph',
          data: {},
          content: [
            {
              nodeType: 'text',
              value: 'By joining you agree to the ',
              marks: [],
              data: {},
            },
            {
              nodeType: 'hyperlink',
              data: { uri: 'https://example.com/terms' },
              content: [
                { nodeType: 'text', value: 'Terms', marks: [], data: {} },
              ],
            },
          ],
        },
      ],
    };

    it('renders ContentfulRichText when termsAndConditions is present', () => {
      const { getByTestId } = render(
        <CampaignOptInSheet
          campaign={createTestCampaign({ termsAndConditions: richTextDoc })}
        />,
      );
      expect(getByTestId('campaign-opt-in-sheet-description')).toBeDefined();
    });

    it('does not render the static terms link when termsAndConditions is present', () => {
      const { queryByTestId } = render(
        <CampaignOptInSheet
          campaign={createTestCampaign({ termsAndConditions: richTextDoc })}
        />,
      );
      expect(queryByTestId('campaign-opt-in-sheet-terms-link')).toBeNull();
    });

    it('renders the static fallback when termsAndConditions is null', () => {
      const { getByTestId } = render(
        <CampaignOptInSheet
          campaign={createTestCampaign({ termsAndConditions: null })}
        />,
      );
      expect(getByTestId('campaign-opt-in-sheet-terms-link')).toBeOnTheScreen();
    });

    it('renders the static fallback when termsAndConditions is malformed', () => {
      const { getByTestId } = render(
        <CampaignOptInSheet
          campaign={createTestCampaign({
            termsAndConditions: 'not a document',
          })}
        />,
      );
      expect(getByTestId('campaign-opt-in-sheet-terms-link')).toBeOnTheScreen();
    });

    it('renders the static fallback when termsAndConditions is a non-document object', () => {
      const { getByTestId } = render(
        <CampaignOptInSheet
          campaign={createTestCampaign({
            termsAndConditions: { foo: 'bar' },
          })}
        />,
      );
      expect(getByTestId('campaign-opt-in-sheet-terms-link')).toBeOnTheScreen();
    });
  });
});
