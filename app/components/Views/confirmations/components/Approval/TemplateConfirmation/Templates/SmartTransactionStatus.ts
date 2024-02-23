import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { processHeader, processString } from '../util';
import { ApprovalRequest } from '@metamask/approval-controller';
import { Colors } from '../../../../../../../util/theme/models';
import { Actions } from '../TemplateConfirmation';
import { ConfirmationTemplateValues, ConfirmationTemplate } from '.';
import Logger from '../../../../../../../util/Logger';

function getValues(
  pendingApproval: ApprovalRequest<any>,
  strings: (key: string) => string,
  actions: Actions,
  colors: Colors,
): ConfirmationTemplateValues {
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
      backgroundColor: colors.success.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  // Logger.log('STX SmartTransactionStatus pendingApproval', pendingApproval);

  return {
    content: [
      {
        key: 'header',
        element: 'View',
        props: {
          style: styles.accountCardWrapper,
        },
        children: [
          ...(processHeader(pendingApproval.requestData?.header) ?? []),
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
                      name: IconName.Confirmation,
                      size: IconSize.Lg,
                      color: IconColor.Success,
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
              title: 'Smart Transaction Status',
            },
          },
          {
            key: 'message',
            element: 'Text',
            props: {
              style: styles.description,
            },
            children: processString(
              pendingApproval.requestState?.smartTransaction?.transactionHash,
              'Waiting for hash...',
            ),
          },
          {
            key: 'message2',
            element: 'Text',
            props: {
              style: styles.description,
            },
            children: pendingApproval.requestState?.smartTransaction?.status,
          },
        ],
      },
    ],
    confirmText: strings('approval_result.ok'),
    onConfirm: actions.onConfirm,
    // onlyConfirmButton: true,
    // TODO if I pass this in, then this component will stay on screen. This is b/c I'm getting "user rejected" for some reason
    // this is called every time it renders, but the actual useApprovalRequest.onReject is only called on swipe down
    onCancel: () => {
      // Logger.log('STX SmartTransactionStatus onCancel');
    },
  };
}

const smartTransactionStatus: ConfirmationTemplate = {
  getValues,
};

export default smartTransactionStatus;
