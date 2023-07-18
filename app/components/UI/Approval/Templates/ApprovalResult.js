import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { processError, processString } from '../util';
import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';

const isApprovalResultTypeSuccess = (type) =>
  ApprovalTypes.RESULT_SUCCESS === type;

function getValues(pendingApproval, strings, actions, colors) {
  const styles = {
    accountCardWrapper: {
      paddingHorizontal: 24,
    },
    description: {
      textAlign: 'center',
      paddingBottom: 16,
    },
    iconContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconWrapper: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isApprovalResultTypeSuccess(pendingApproval?.type)
        ? colors.success.muted
        : colors.error.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
  };
  return {
    content: [
      {
        key: 'header',
        element: 'View',
        props: {
          style: styles.accountCardWrapper,
        },
        children: [
          ...(pendingApproval.requestData.header || []),
          {
            key: 'content',
            element: 'View',
            props: {
              style: styles.iconContainer,
            },
            children: [
              {
                key: 'iconWrapper',
                element: 'View',
                props: {
                  style: styles.iconWrapper,
                },
                children: [
                  {
                    key: 'icon',
                    element: 'Icon',
                    props: {
                      name: isApprovalResultTypeSuccess(pendingApproval?.type)
                        ? IconName.Confirmation
                        : IconName.Warning,
                      size: IconSize.Lg,
                      color: isApprovalResultTypeSuccess(pendingApproval?.type)
                        ? IconColor.Success
                        : IconColor.Error,
                    },
                    children: 'Icon',
                  },
                ],
              },
            ],
          },
          {
            key: 'heading',
            element: 'SheetHeader',
            props: {
              title: isApprovalResultTypeSuccess(pendingApproval?.type)
                ? strings('approval_result.success')
                : strings('approval_result.error'),
            },
          },
          {
            key: 'message',
            element: 'Text',
            props: {
              style: styles.description,
            },
            children: isApprovalResultTypeSuccess(pendingApproval?.type)
              ? processString(
                  pendingApproval.requestData.message,
                  strings('approval_result.resultPageSuccessDefaultMessage'),
                )
              : processError(
                  pendingApproval.requestData.error,
                  strings('approval_result.resultPageErrorDefaultMessage'),
                ),
          },
        ],
      },
    ],
    submitText: strings('approval_result.ok'),
    onSubmit: () => actions,
  };
}

const approvalResult = {
  getValues,
};

export default approvalResult;
