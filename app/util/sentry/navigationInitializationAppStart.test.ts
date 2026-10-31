import {
  extendAppStart,
  finishExtendedAppStart,
  getClient,
  getExtendedAppStartSpan,
  spanIsSampled,
  startInactiveSpan,
} from '@sentry/react-native';
import {
  beginNavigationInitializationAppStart,
  endNavigationInitializationAppStart,
  NAVIGATION_INITIALIZATION_SPAN_NAME,
  resetNavigationInitializationAppStartForTesting,
} from './navigationInitializationAppStart';

const mockedExtendAppStart = jest.mocked(extendAppStart);
const mockedGetExtendedAppStartSpan = jest.mocked(getExtendedAppStartSpan);
const mockedSpanIsSampled = jest.mocked(spanIsSampled);
const mockedStartInactiveSpan = jest.mocked(startInactiveSpan);
const mockedFinishExtendedAppStart = jest.mocked(finishExtendedAppStart);
const mockedGetClient = jest.mocked(getClient);

/**
 * Registers a fake `AppRegistry` integration and returns a trigger for the
 * callback the SDK would invoke from `AppRegistry.runApplication`.
 */
function mockAppRegistryIntegration(): () => void {
  let runApplicationCallback: (() => void) | undefined;

  mockedGetClient.mockReturnValue({
    getIntegrationByName: () => ({
      name: 'AppRegistry',
      onRunApplication: (callback: () => void) => {
        runApplicationCallback = callback;
      },
    }),
  } as never);

  return () => runApplicationCallback?.();
}

describe('navigationInitializationAppStart', () => {
  const mockParentSpan = { extended: true };
  const mockChildEnd = jest.fn();

  beforeEach(() => {
    resetNavigationInitializationAppStartForTesting();
    jest.clearAllMocks();
    mockedGetExtendedAppStartSpan.mockReturnValue(mockParentSpan as never);
    mockedSpanIsSampled.mockReturnValue(true);
    mockedStartInactiveSpan.mockReturnValue({ end: mockChildEnd } as never);
  });

  it('starts Navigation Initialization under extended App Start after begin', () => {
    beginNavigationInitializationAppStart();

    expect(mockedExtendAppStart).toHaveBeenCalledTimes(1);
    expect(mockedStartInactiveSpan).toHaveBeenCalledWith({
      name: NAVIGATION_INITIALIZATION_SPAN_NAME,
      op: 'navigation.init',
      parentSpan: mockParentSpan,
    });
    expect(mockedFinishExtendedAppStart).not.toHaveBeenCalled();
  });

  it('does not start a second child when begin is called twice', () => {
    beginNavigationInitializationAppStart();
    beginNavigationInitializationAppStart();

    expect(mockedExtendAppStart).toHaveBeenCalledTimes(1);
    expect(mockedStartInactiveSpan).toHaveBeenCalledTimes(1);
  });

  it('ends the child and finishes extended App Start on navigation ready', () => {
    beginNavigationInitializationAppStart();

    endNavigationInitializationAppStart();

    expect(mockChildEnd).toHaveBeenCalledTimes(1);
    expect(mockedFinishExtendedAppStart).toHaveBeenCalledTimes(1);
  });

  it('does not finish App Start twice when navigation ready is reported twice', () => {
    beginNavigationInitializationAppStart();
    endNavigationInitializationAppStart();
    endNavigationInitializationAppStart();

    expect(mockChildEnd).toHaveBeenCalledTimes(1);
    expect(mockedFinishExtendedAppStart).toHaveBeenCalledTimes(1);
  });

  it('finishes immediately when navigation is ready before Sentry init', () => {
    endNavigationInitializationAppStart();

    expect(mockedFinishExtendedAppStart).not.toHaveBeenCalled();

    beginNavigationInitializationAppStart();

    expect(mockChildEnd).toHaveBeenCalledTimes(1);
    expect(mockedFinishExtendedAppStart).toHaveBeenCalledTimes(1);
  });

  it('skips the child when App Start was already captured for this run', () => {
    mockedSpanIsSampled.mockReturnValue(false);

    beginNavigationInitializationAppStart();

    expect(mockedExtendAppStart).toHaveBeenCalledTimes(1);
    expect(mockedStartInactiveSpan).not.toHaveBeenCalled();
  });

  it('retries the extension on a later init when the first attempt found no extended span', () => {
    mockedSpanIsSampled.mockReturnValue(false);
    beginNavigationInitializationAppStart();

    mockedSpanIsSampled.mockReturnValue(true);
    beginNavigationInitializationAppStart();

    expect(mockedExtendAppStart).toHaveBeenCalledTimes(2);
    expect(mockedStartInactiveSpan).toHaveBeenCalledTimes(1);
  });

  it('re-extends App Start when runApplication discards the extension', () => {
    const triggerRunApplication = mockAppRegistryIntegration();
    beginNavigationInitializationAppStart();

    // The SDK drops the extension during its own runApplication reset, then
    // the next extendAppStart call restores it.
    mockedSpanIsSampled.mockReturnValueOnce(false).mockReturnValue(true);
    triggerRunApplication();

    expect(mockedExtendAppStart).toHaveBeenCalledTimes(2);
    expect(mockedStartInactiveSpan).toHaveBeenCalledTimes(2);
  });

  it('leaves an intact extension alone on runApplication', () => {
    const triggerRunApplication = mockAppRegistryIntegration();
    beginNavigationInitializationAppStart();

    triggerRunApplication();

    expect(mockedExtendAppStart).toHaveBeenCalledTimes(1);
    expect(mockedStartInactiveSpan).toHaveBeenCalledTimes(1);
  });

  it('does not re-extend after navigation is ready', () => {
    const triggerRunApplication = mockAppRegistryIntegration();
    beginNavigationInitializationAppStart();
    endNavigationInitializationAppStart();

    mockedSpanIsSampled.mockReturnValue(false);
    triggerRunApplication();

    expect(mockedExtendAppStart).toHaveBeenCalledTimes(1);
    expect(mockedFinishExtendedAppStart).toHaveBeenCalledTimes(1);
  });
});
