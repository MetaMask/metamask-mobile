/* eslint-disable react/prop-types */
import React from 'react';
import { View, ViewProps } from 'react-native';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../hooks/useStyles';
import { EditSpendingCapButton } from '../../../Views/confirmations/components/edit-spending-cap-button';
import { ApproveMethod } from '../../../Views/confirmations/types/approve';
import { AssetIdentifier, AssetType, BalanceChange } from '../types';
import AmountPill from '../AmountPill/AmountPill';
import AssetPill from '../AssetPill/AssetPill';
import { IndividualFiatDisplay } from '../FiatDisplay/FiatDisplay';
import styleSheet from './BalanceChangeRow.styles';
import AlertRow from '../../../Views/confirmations/components/UI/info-row/alert-row';
import { RowAlertKey } from '../../../Views/confirmations/components/UI/info-row/alert-row/constants';
import alertRowStyleSheet from '../../../Views/confirmations/components/UI/info-row/alert-row/alert-row.styles';

interface BalanceChangeRowProperties extends ViewProps {
  approveMethod?: ApproveMethod;
  balanceChange: BalanceChange;
  label?: string;
  onApprovalAmountUpdate?: (
    balanceChange: BalanceChange,
    newSpendingCap: string,
  ) => Promise<void>;
  showFiat?: boolean;
  hasIncomingTokens?: boolean;
}

const BalanceChangeRow: React.FC<BalanceChangeRowProperties> = ({
  approveMethod,
  balanceChange,
  label,
  onApprovalAmountUpdate,
  showFiat,
  hasIncomingTokens,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { styles: alertRowStyles } = useStyles(alertRowStyleSheet, {});
  const { asset, amount, fiatAmount, isAllApproval, isUnlimitedApproval } =
    balanceChange;
  const isERC20 = balanceChange.asset.type === AssetType.ERC20;
  const shouldShowEditSpendingCapButton = isERC20 && onApprovalAmountUpdate;

  const renderLabel = () => {
    if (!label) {
      return null;
    }
    if (hasIncomingTokens) {
      return (
        <AlertRow
          alertField={RowAlertKey.IncomingTokens}
          label={label}
          style={alertRowStyles.alertRowOverride}
        />
      );
    }
    return (
      <Text
        testID="balance-change-row-label"
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
      >
        {label}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {renderLabel()}
      <View style={styles.pillContainer}>
        <View style={styles.pills}>
          {shouldShowEditSpendingCapButton ? (
            <EditSpendingCapButton
              spendingCapProps={{
                approveMethod: approveMethod as ApproveMethod,
                balance: balanceChange.balance?.toString() ?? '0',
                decimals: balanceChange.decimals ?? 1,
                onSpendingCapUpdate: (spendingCap: string) =>
                  onApprovalAmountUpdate(balanceChange, spendingCap),
                spendingCap: balanceChange.amount.abs().toString(),
                tokenSymbol: balanceChange.tokenSymbol,
              }}
            >
              <AmountAndAddress
                asset={asset}
                amount={amount}
                isAllApproval={isAllApproval}
                isUnlimitedApproval={isUnlimitedApproval}
              />
            </EditSpendingCapButton>
          ) : (
            <AmountAndAddress
              asset={asset}
              amount={amount}
              isAllApproval={isAllApproval}
              isUnlimitedApproval={isUnlimitedApproval}
            />
          )}
        </View>
        {showFiat && (
          <IndividualFiatDisplay
            testID="balance-change-row-fiat-display"
            fiatAmount={fiatAmount}
          />
        )}
      </View>
    </View>
  );
};

interface AmountAndAddressProps {
  asset: AssetIdentifier;
  amount: BigNumber;
  isAllApproval?: boolean;
  isUnlimitedApproval?: boolean;
}

function AmountAndAddress({
  asset,
  amount,
  isAllApproval,
  isUnlimitedApproval,
}: AmountAndAddressProps) {
  return (
    <>
      <AmountPill
        asset={asset}
        amount={amount}
        isAllApproval={isAllApproval}
        isUnlimitedApproval={isUnlimitedApproval}
        testID="balance-change-row-amount-pill"
      />
      <AssetPill asset={asset} testID="balance-change-row-asset-pill" />
    </>
  );
}

export default BalanceChangeRow;
