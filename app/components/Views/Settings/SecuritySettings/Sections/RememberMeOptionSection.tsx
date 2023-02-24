import React, { useCallback, useEffect, useState } from 'react';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import { strings } from '../../../../../../locales/i18n';
import { useSelector, useDispatch } from 'react-redux';
import { setAllowLoginWithRememberMe } from '../../../../../actions/security';
import { useNavigation } from '@react-navigation/native';
import { createTurnOffRememberMeModalNavDetails } from '../../../..//UI/TurnOffRememberMeModal/TurnOffRememberMeModal';

import { SECURITY_PRIVACY_REMEMBER_ME_TOGGLE } from '../../../../../../wdio/screen-objects/testIDs/Screens/SecurityPrivacy.testIds';
import { Authentication } from '../../../../../core';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';

const RememberMeOptionSection = () => {
  const { navigate } = useNavigation();
  const allowLoginWithRememberMe = useSelector(
    (state: any) => state.security.allowLoginWithRememberMe,
  );

  const [isUsingRememberMe, setIsUsingRememberMe] = useState<boolean>(false);
  useEffect(() => {
    const checkIfAlreadyUsingRememberMe = async () => {
      const authType = await Authentication.getType();
      setIsUsingRememberMe(
        authType.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME,
      );
    };
    checkIfAlreadyUsingRememberMe();
  }, []);

  const dispatch = useDispatch();

  const toggleRememberMe = useCallback(
    (value: boolean) => {
      dispatch(setAllowLoginWithRememberMe(value));
    },
    [dispatch],
  );

  const onValueChanged = useCallback(
    (enabled: boolean) => {
      isUsingRememberMe
        ? navigate(...createTurnOffRememberMeModalNavDetails())
        : toggleRememberMe(enabled);
    },
    [isUsingRememberMe, navigate, toggleRememberMe],
  );

  return (
    <SecurityOptionToggle
      title={strings(`remember_me.enable_remember_me`)}
      description={strings(`remember_me.enable_remember_me_description`)}
      value={allowLoginWithRememberMe}
      onOptionUpdated={(value) => onValueChanged(value)}
      testId={SECURITY_PRIVACY_REMEMBER_ME_TOGGLE}
    />
  );
};

export default React.memo(RememberMeOptionSection);
