import { clearPinDraft, getPinDraft, setPinDraft } from './pinDraftStore';

describe('pinDraftStore', () => {
  afterEach(() => {
    clearPinDraft();
  });

  it('stores and clears the draft PIN', () => {
    expect(getPinDraft()).toBeNull();
    setPinDraft('1337');
    expect(getPinDraft()).toBe('1337');
    clearPinDraft();
    expect(getPinDraft()).toBeNull();
  });
});
