import { NavigationHandler } from '../NavigationHandler';
import { ACTIONS } from '../../../../../constants/deeplinks';
import Routes from '../../../../../constants/navigation/Routes';
import { createMockContext, createMockLink } from '../../../utils/testUtils';

jest.mock('../../../../../util/Logger');

describe('NavigationHandler', () => {
  let handler: NavigationHandler;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    handler = new NavigationHandler();
    mockContext = createMockContext();
  });

  it('navigates to home screen', async () => {
    const link = createMockLink(ACTIONS.HOME);

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      undefined,
    );
  });

  it('navigates to create account modal', async () => {
    const link = createMockLink(ACTIONS.CREATE_ACCOUNT);

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      { screen: Routes.MODAL.MODAL_CONFIRMATION },
    );
  });

  it('navigates to rewards with referral code params', async () => {
    const link = createMockLink(ACTIONS.REWARDS, {
      code: 'REFER123',
      campaign: 'twitter2024',
    });

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
      Routes.REWARDS_VIEW,
      {
        code: 'REFER123',
        campaign: 'twitter2024',
      },
    );
  });

  it('returns error for unknown action', async () => {
    const link = createMockLink('unknown-action');

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(false);
    expect(result.error?.message).toContain('Unsupported navigation action');
  });

  it('navigates to perps markets with default path', async () => {
    const link = createMockLink(ACTIONS.PERPS);

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
      Routes.PERPS.ROOT,
      { path: '/markets' },
    );
  });

  it('navigates to perps with custom path from params', async () => {
    const link = createMockLink(ACTIONS.PERPS_ASSET, {
      perpsPath: '/assets/ETH-PERP',
    });

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
      Routes.PERPS.ROOT,
      { path: '/assets/ETH-PERP' },
    );
  });

  it('returns error result when navigation throws exception', async () => {
    const navigationError = new Error('Navigation failed');
    mockContext.navigation.navigate = jest.fn(() => {
      throw navigationError;
    });
    const link = createMockLink(ACTIONS.HOME);

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(false);
    expect(result.error).toBe(navigationError);
  });
});
