import Routes from '../../../../constants/navigation/Routes';
import ReactQueryService from '../../../../core/ReactQueryService';
import { buildTraderProfileQueryKey } from '../../../../util/social/traderProfileQueries';
import {
  hasAcceptedSocialTerms,
  recordSocialTermsAcceptanceForExistingProfile,
} from '../terms/socialTermsAcceptance';
import { openSocialTraderPreviewIfNotJoined } from './openSocialTraderPreview';
import {
  getPendingSocialPreviewTarget,
  setPendingSocialPreviewTarget,
} from './pendingSocialPreviewTarget';

jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: { queryClient: { prefetchQuery: jest.fn() } },
}));

jest.mock('./useSharedPositionPreview', () => ({
  buildSharedPositionPreviewQuery: (positionId: string, traderId: string) => ({
    queryKey: ['SocialTraderPreview:sharedPosition', positionId, traderId],
  }),
}));

jest.mock('../terms/socialTermsAcceptance', () => ({
  hasAcceptedSocialTerms: jest.fn(),
  recordSocialTermsAcceptanceForExistingProfile: jest.fn(),
}));

describe('openSocialTraderPreviewIfNotJoined', () => {
  const navigate = jest.fn();

  const prefetchQuery = ReactQueryService.queryClient
    .prefetchQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    prefetchQuery.mockResolvedValue(undefined);
    setPendingSocialPreviewTarget(null);
  });

  it('opens the preview over Home and keeps the link when the user has not joined Social', () => {
    jest.mocked(hasAcceptedSocialTerms).mockReturnValue(false);

    const opened = openSocialTraderPreviewIfNotJoined(
      { navigate },
      { kind: 'position', traderId: 'trader-1', positionId: 'position-1' },
    );

    expect(opened).toBe(true);
    expect(recordSocialTermsAcceptanceForExistingProfile).toHaveBeenCalled();
    expect(navigate).toHaveBeenNthCalledWith(1, Routes.WALLET.HOME);
    expect(navigate).toHaveBeenNthCalledWith(
      2,
      Routes.SOCIAL.TRADER_PREVIEW_SHEET,
      { traderId: 'trader-1', positionId: 'position-1' },
    );
    expect(getPendingSocialPreviewTarget()).toEqual({
      kind: 'position',
      traderId: 'trader-1',
      positionId: 'position-1',
      stage: 'previewing',
    });
  });

  it('starts loading the trader profile and shared position before the sheet opens', () => {
    jest.mocked(hasAcceptedSocialTerms).mockReturnValue(false);

    openSocialTraderPreviewIfNotJoined(
      { navigate },
      { kind: 'position', traderId: 'trader-1', positionId: 'position-1' },
    );

    expect(prefetchQuery).toHaveBeenCalledWith({
      queryKey: buildTraderProfileQueryKey('trader-1'),
    });
    expect(prefetchQuery).toHaveBeenCalledWith({
      queryKey: [
        'SocialTraderPreview:sharedPosition',
        'position-1',
        'trader-1',
      ],
    });
  });

  it('only prefetches the profile for a profile link', () => {
    jest.mocked(hasAcceptedSocialTerms).mockReturnValue(false);

    openSocialTraderPreviewIfNotJoined(
      { navigate },
      { kind: 'trader', traderId: 'trader-1' },
    );

    expect(prefetchQuery).toHaveBeenCalledTimes(1);
  });

  it('lets the caller open the link when the user has joined Social', () => {
    jest.mocked(hasAcceptedSocialTerms).mockReturnValue(true);

    const opened = openSocialTraderPreviewIfNotJoined(
      { navigate },
      { kind: 'trader', traderId: 'trader-1' },
    );

    expect(opened).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(prefetchQuery).not.toHaveBeenCalled();
    expect(getPendingSocialPreviewTarget()).toBeNull();
  });
});
