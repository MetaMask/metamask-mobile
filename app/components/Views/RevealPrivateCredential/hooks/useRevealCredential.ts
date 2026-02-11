import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { store } from '../../../../store';
import { recordSRPRevealTimestamp } from '../../../../actions/privacy';
import { WRONG_PASSWORD_ERROR } from '../../../../constants/error';
import { strings } from '../../../../../locales/i18n';
import { isHardwareAccount } from '../../../../util/address';
import useAuthentication from '../../../../core/Authentication/hooks/useAuthentication';
import { ReauthenticateErrorType } from '../../../../core/Authentication/types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { getTraceTags } from '../../../../util/sentry/tags';

interface UseRevealCredentialProps {
  selectedAddress?: string;
  keyringId?: string;
}

interface UseRevealCredentialReturn {
  unlocked: boolean;
  password: string;
  warningIncorrectPassword: string;
  clipboardPrivateCredential: string;
  setPassword: (password: string) => void;
  revealCredential: (pswd?: string) => Promise<void>;
  tryUnlock: () => Promise<void>;
}

const useRevealCredential = ({
  selectedAddress,
  keyringId,
}: UseRevealCredentialProps): UseRevealCredentialReturn => {
  const [clipboardPrivateCredential, setClipboardPrivateCredential] =
    useState<string>('');
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [warningIncorrectPassword, setWarningIncorrectPassword] =
    useState<string>('');

  const dispatch = useDispatch();
  const { reauthenticate, revealSRP } = useAuthentication();
  const { trackEvent, createEventBuilder } = useMetrics();

  const revealCredential = useCallback(
    async (pswd?: string) => {
      const traceName = TraceName.RevealSrp;
      let passwordToUse = pswd;

      try {
        if (!passwordToUse) {
          const { password: verifiedPassword } = await reauthenticate();
          passwordToUse = verifiedPassword;
        }

        trace({
          name: traceName,
          op: TraceOperation.RevealPrivateCredential,
          tags: getTraceTags(store.getState()),
        });

        const privateCredential = await revealSRP(passwordToUse, keyringId);

        if (privateCredential) {
          setClipboardPrivateCredential(privateCredential);
          setUnlocked(true);

          endTrace({
            name: traceName,
          });
        }
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (
          e.message.includes(
            ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS,
          )
        ) {
          return;
        }
        let msg = strings('reveal_credential.warning_incorrect_password');
        if (selectedAddress && isHardwareAccount(selectedAddress)) {
          msg = strings('reveal_credential.hardware_error');
        } else if (
          e.toString().toLowerCase() !== WRONG_PASSWORD_ERROR.toLowerCase()
        ) {
          msg = strings('reveal_credential.unknown_error');
        }

        setUnlocked(false);
        setWarningIncorrectPassword(msg);
      }
    },
    [selectedAddress, keyringId, reauthenticate, revealSRP],
  );

  const tryUnlock = useCallback(async () => {
    try {
      await reauthenticate(password);
    } catch {
      const msg = strings('reveal_credential.warning_incorrect_password');
      setWarningIncorrectPassword(msg);
      return;
    }

    const currentDate = new Date();
    dispatch(recordSRPRevealTimestamp(currentDate.toString()));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NEXT_REVEAL_SRP_CTA).build(),
    );
    revealCredential(password);
    setWarningIncorrectPassword('');
  }, [
    password,
    reauthenticate,
    dispatch,
    trackEvent,
    createEventBuilder,
    revealCredential,
  ]);

  return {
    unlocked,
    password,
    warningIncorrectPassword,
    clipboardPrivateCredential,
    setPassword,
    revealCredential,
    tryUnlock,
  };
};

export default useRevealCredential;
