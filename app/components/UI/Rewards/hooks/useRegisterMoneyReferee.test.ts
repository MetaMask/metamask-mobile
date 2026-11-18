import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services';
import {
  MAX_REFERRAL_ME_REFRESH_ATTEMPTS,
  useRegisterMoneyReferee,
} from './useRegisterMoneyReferee';

const mockFetchReferralMe = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('./useReferralMe', () => ({
  useReferralMe: () => ({ fetchReferralMe: mockFetchReferralMe }),
}));

describe('useRegisterMoneyReferee', () => {
  const mockCall = jest.mocked(Engine.controllerMessenger.call);

  const mockMessenger = ({
    validate = () => Promise.resolve({ success: true }),
    register = () => Promise.resolve(undefined),
  }: {
    validate?: () => Promise<unknown>;
    register?: () => Promise<unknown>;
  } = {}) => {
    mockCall.mockImplementation(((action: string) => {
      if (action === 'RewardsMoneyController:validateReferralCode') {
        return validate();
      }
      if (action === 'RewardsMoneyController:registerReferee') {
        return register();
      }
      return Promise.resolve(undefined);
    }) as typeof mockCall);
  };

  const registerCalls = () =>
    mockCall.mock.calls.filter(
      ([action]) => action === 'RewardsMoneyController:registerReferee',
    );

  const run = (code: string) => {
    const { result } = renderHook(() => useRegisterMoneyReferee());
    return result.current(code);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchReferralMe.mockResolvedValue({
      status: 'settled',
      profileId: 'profile-1',
    });
  });

  it('validates, registers the normalized code and reads referral me back', async () => {
    mockMessenger();

    const result = await run('kol1');

    expect(result).toEqual({ status: 'accepted' });
    expect(registerCalls()).toEqual([
      ['RewardsMoneyController:registerReferee', { code: 'KOL1' }],
    ]);
    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
  });

  it('stops before register when the code is rejected', async () => {
    mockMessenger({ validate: () => Promise.resolve({ success: false }) });

    const result = await run('KOL1');

    expect(result).toEqual({
      status: 'invalid',
      message: strings('rewards.error_messages.invalid_referral_code'),
    });
    expect(registerCalls()).toHaveLength(0);
  });

  it('still registers when validation could not reach the server', async () => {
    mockMessenger({ validate: () => Promise.reject(new Error('offline')) });

    const result = await run('KOL1');

    expect(result).toEqual({ status: 'accepted' });
    expect(registerCalls()).toHaveLength(1);
  });

  it('reports a rate-limited validation as refused without registering', async () => {
    const error = new RewardsMoneyHttpError('slow down', 429);
    mockMessenger({ validate: () => Promise.reject(error) });

    const result = await run('KOL1');

    expect(result).toEqual({ status: 'refused', error });
    expect(registerCalls()).toHaveLength(0);
  });

  it('reports a refused registration with what was thrown', async () => {
    const error = new RewardsMoneyHttpError('conflict', 409);
    mockMessenger({ register: () => Promise.reject(error) });

    const result = await run('KOL1');

    expect(result).toEqual({ status: 'refused', error });
    expect(mockFetchReferralMe).not.toHaveBeenCalled();
  });

  it('retries the read back while the session changes, up to the limit', async () => {
    mockMessenger();
    mockFetchReferralMe.mockResolvedValue({
      status: 'discarded',
      profileId: 'profile-2',
    });

    const result = await run('KOL1');

    expect(result).toEqual({ status: 'accepted' });
    expect(mockFetchReferralMe).toHaveBeenCalledTimes(
      MAX_REFERRAL_ME_REFRESH_ATTEMPTS,
    );
  });

  it('stays accepted when the read back fails', async () => {
    mockMessenger();
    mockFetchReferralMe.mockRejectedValue(new Error('offline'));

    const result = await run('KOL1');

    expect(result).toEqual({ status: 'accepted' });
  });
});
