import { omit, pick } from 'lodash';
import approvalResult from './ApprovalResult';
import { ApprovalTypes } from '../../../../../core/RPCMethods/RPCMethodMiddleware';
import { Actions } from '../TemplateConfirmation';
import { Colors } from 'app/util/theme/models';
import { ApprovalRequest } from '@metamask/approval-controller';

const APPROVAL_TEMPLATES: { [key: string]: any } = {
  [ApprovalTypes.RESULT_SUCCESS]: approvalResult,
  [ApprovalTypes.RESULT_ERROR]: approvalResult,
};

export const TEMPLATED_CONFIRMATION_APPROVAL_TYPES =
  Object.keys(APPROVAL_TEMPLATES);

const ALLOWED_TEMPLATE_KEYS: string[] = [
  'cancelText',
  'content',
  'onCancel',
  'onSubmit',
  'onConfirm',
  'submitText',
  'loadingText',
];

export function getTemplateValues(
  pendingApproval: ApprovalRequest<any>,
  stringFn: (key: string) => string,
  actions: Actions,
  colors: Colors,
) {
  const fn = APPROVAL_TEMPLATES[pendingApproval.type]?.getValues;
  if (!fn) {
    throw new Error(
      `APPROVAL_TYPE: '${pendingApproval.type}' is not specified in approval templates`,
    );
  }

  const values = fn(pendingApproval, stringFn, actions, colors);
  const extraneousKeys = omit(values, ALLOWED_TEMPLATE_KEYS);
  const safeValues = pick(values, ALLOWED_TEMPLATE_KEYS);
  if (Object.keys(extraneousKeys).length > 0) {
    throw new Error(
      `Received extraneous keys from ${
        pendingApproval.type
      }.getValues. These keys are not passed to the confirmation page: ${Object.keys(
        extraneousKeys,
      )}`,
    );
  }
  return safeValues;
}
