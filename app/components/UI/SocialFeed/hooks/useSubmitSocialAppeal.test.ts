import { renderHook } from '@testing-library/react-native';
import {
  useSubmitSocialAppeal,
  type SocialAppeal,
} from './useSubmitSocialAppeal';

const APPEAL: SocialAppeal = {
  email: 'alex@example.com',
  message: 'I think this is wrong.',
  decision: 'post-removed',
  handle: 'alphawhale',
  reason: 'Promises guaranteed returns',
};

const setup = () => {
  const onSent = jest.fn();
  const onFailed = jest.fn();
  const { result } = renderHook(() =>
    useSubmitSocialAppeal({ onSent, onFailed }),
  );
  return { submit: result.current, onSent, onFailed };
};

// TODO(TSA-1668): replace with Intercom hand-off tests once that PR lands.
describe('useSubmitSocialAppeal', () => {
  it('confirms receipt of the appeal right away', () => {
    const { submit, onSent, onFailed } = setup();

    submit(APPEAL);

    expect(onSent).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
  });
});
