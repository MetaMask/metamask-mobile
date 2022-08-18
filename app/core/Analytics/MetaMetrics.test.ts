import MetaMetrics from './MetaMetrics';
import { States } from './MetaMetrics.types';

describe('MetaMetrics', () => {
  beforeAll(() => {
    MetaMetrics.enable();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should get the correct state of the MetaMetrics instance', () => {
    expect(MetaMetrics.state()).toBe(States.enabled);
  });

  it('should disable MetaMetrics', () => {
    MetaMetrics.disable();
    expect(MetaMetrics.state()).toBe(States.disabled);
  });

  it('should enable MetaMetrics', () => {
    MetaMetrics.enable();
    expect(MetaMetrics.state()).toBe(States.enabled);
  });

  // it('should call private method to identify an user with traits', () => {
  //   const mockUserTraits = {
  //     traitOne: 'traitOne',
  //     traitTwo: 'traitTwo',
  //   };
  //   const identifySpy = jest.spyOn(
  //     Object.getPrototypeOf(MetaMetrics),
  //     'MetaMetrics.#identify',
  //   );
  //   MetaMetrics.addTraitsToUser(mockUserTraits);
  //   expect(identifySpy).toBeCalled();
  // });

  // it('should use private method to group an user and add traits', () => {
  //   const mockGroupId = 'Group1';
  //   const mockGroupTraits = {
  //     traitOne: 'traitOne',
  //     traitTwo: 'traitTwo',
  //   };
  //   const groupSpy = jest.spyOn(Object.getPrototypeOf(MetaMetrics), '#group');
  //   MetaMetrics.group(mockGroupId, mockGroupTraits);
  //   expect(groupSpy).toBeCalled();
  // });

  // it('should use private method to track an user if tracking is enabled', () => {
  //   const mockEvent = 'event name';
  //   const mockProperties = {
  //     propOne: 'propOne',
  //     propTwo: 'propTwo',
  //   };
  //   const trackSpy = jest.spyOn(
  //     Object.getPrototypeOf(MetaMetrics),
  //     'MetaMetrics.#trackEvent',
  //   );
  //   MetaMetrics.trackEvent(mockEvent, false, mockProperties);
  //   expect(trackSpy).toBeCalled();
  // });

  // it('should not track an user if tracking is disabled', () => {
  //   MetaMetrics.disable();
  //   const mockEvent = 'event name';
  //   const mockProperties = {
  //     propOne: 'propOne',
  //     propTwo: 'propTwo',
  //   };
  //   const trackSpy = jest.spyOn(
  //     Object.getPrototypeOf(MetaMetrics),
  //     '#trackEvent',
  //   );
  //   MetaMetrics.trackEvent(mockEvent, false, mockProperties);
  //   expect(trackSpy).not.toBeCalled();
  // });
});
