import { NavigationHandler } from './NavigationHandler';
import { ACTIONS } from '../../../../constants/deeplinks';
import Routes from '../../../../constants/navigation/Routes';
import { createMockContext, createMockLink } from '../testUtils';

jest.mock('../../../../util/Logger');

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

  it('returns error for unknown action', async () => {
    const link = createMockLink('unknown-action');

    const result = await handler.handle(link, mockContext);

    expect(result.handled).toBe(false);
    expect(result.error?.message).toContain('Unsupported navigation action');
  });
});
