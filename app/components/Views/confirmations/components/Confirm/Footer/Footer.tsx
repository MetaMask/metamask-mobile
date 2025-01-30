import React from 'react';

import { ConfirmationFooterSelectorIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../locales/i18n';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonsAlignment } from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.types';
import { useStyles } from '../../../../../../component-library/hooks';
import { ResultType } from '../../../constants/signatures';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useSecurityAlertResponse } from '../../../hooks/useSecurityAlertResponse';
import styleSheet from './Footer.styles';

const Footer = () => {
  const { onConfirm, onReject } = useConfirmActions();
  const { securityAlertResponse } = useSecurityAlertResponse();

  const { styles } = useStyles(styleSheet, {});

  const buttons = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('confirm.reject'),
      size: ButtonSize.Lg,
      onPress: onReject,
      testID: ConfirmationFooterSelectorIDs.CANCEL_BUTTON,
    },
    {
      variant: ButtonVariants.Primary,
      isDanger: securityAlertResponse?.result_type === ResultType.Malicious,
      label: strings('confirm.confirm'),
      size: ButtonSize.Lg,
      onPress: onConfirm,
      testID: ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    },
  ];

  return (
    <BottomSheetFooter
      buttonsAlignment={ButtonsAlignment.Horizontal}
      buttonPropsArray={buttons}
      isBackgroundAlternative
      style={styles.base}
    />
  );
};

export default Footer;
