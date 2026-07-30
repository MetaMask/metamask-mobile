import React from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import type { Hex } from '@metamask/utils';
import type { MetamaskPayMetadata } from '@metamask/transaction-controller';
import { strings } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { selectTransactionMetadataByHash } from '../../../../selectors/transactionController';
import {
  mobileActivityAdapterEnvironment,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
import { getNetworkImageSource } from '../../../../util/networks';
import { getTokenImageSource } from '../../../UI/ActivityListItemRow/tokenIcon';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from './ActivityDetailsLayout';
import { ActivityFeeTokenValue } from './ActivityDetailsFeeValue';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

/** Pay records its fiat values in USD, not the user's display currency. */
const PAY_FIAT_CURRENCY = 'usd';

/** Symbol + asset id of the token a Pay fee is denominated in. */
interface PayFeeToken {
  symbol?: string;
  assetId?: string;
}

/**
 * MetaMask Pay's pre-aggregated fiat fees, read off the row's local transaction.
 * Pay-routed rows carry no token-denominated `data.fees`, so this is their only
 * fee source — the same one the legacy details screen reads.
 */
function getLocalPayMetadata(
  item: ActivityListItem,
): MetamaskPayMetadata | undefined {
  return item.raw?.type === 'localTransaction'
    ? item.raw.data.primaryTransaction?.metamaskPay
    : undefined;
}

function hasPayFiat(pay: MetamaskPayMetadata | undefined): boolean {
  return Boolean(pay?.networkFeeFiat || pay?.bridgeFeeFiat || pay?.totalFiat);
}

/**
 * A row's Pay fiat metadata, or `undefined` when there is nothing to render —
 * so templates can decide up front whether to add the section's divider. Fiat
 * rather than fees: a row carrying only `totalFiat` still renders a section.
 *
 * Local rows carry `metamaskPay` directly. Provider-backed rows (Perps, whose
 * HyperLiquid feed entry dedups the local EVM copy away) carry only the on-chain
 * hash, so their metadata is resolved from the local transaction it belongs to.
 */
export function useActivityPayFiat(
  item: ActivityListItem,
): MetamaskPayMetadata | undefined {
  const localPay = getLocalPayMetadata(item);
  const { hash } = item;
  const payByHash = useSelector((state: RootState) =>
    localPay
      ? undefined
      : selectTransactionMetadataByHash(state, hash)?.metamaskPay,
  );
  const pay = localPay ?? payByHash;

  return hasPayFiat(pay) ? pay : undefined;
}

/**
 * Tokens the Pay fee rows are denominated in. Both fees are charged on the
 * source side, so both come off the payment chain: network fee in its native
 * asset (the fee is source-chain gas), bridge fee in the payment token. The
 * quote records both as bare fiat, so these denominations are implied by how
 * Pay charges them, not read back from it.
 */
function usePayFeeTokens(pay: MetamaskPayMetadata | undefined): {
  networkFeeToken: PayFeeToken;
  bridgeFeeToken: PayFeeToken;
} {
  const { chainId: payChainId, tokenAddress } = pay ?? {};
  const importedPayToken = useSelector((state: RootState) =>
    payChainId && tokenAddress
      ? selectSingleTokenByAddressAndChainId(state, tokenAddress, payChainId)
      : undefined,
  );

  const { getNativeAssetForChainId, nativeTokenAddress, equalsIgnoreCase } =
    mobileActivityAdapterEnvironment;
  const nativeAsset = payChainId
    ? getNativeAssetForChainId(payChainId)
    : undefined;
  const networkFeeToken: PayFeeToken = {
    symbol: nativeAsset?.symbol,
    assetId: nativeAsset?.assetId,
  };

  if (!tokenAddress || equalsIgnoreCase(tokenAddress, nativeTokenAddress)) {
    return { networkFeeToken, bridgeFeeToken: networkFeeToken };
  }

  return {
    networkFeeToken,
    bridgeFeeToken: {
      symbol: importedPayToken?.symbol,
      assetId: mobileActivityAdapterEnvironment.toAssetId(
        tokenAddress,
        payChainId,
      ),
    },
  };
}

function PayFeeValue({
  value,
  token,
  chainId,
}: {
  value: string;
  token: PayFeeToken;
  chainId: Hex | undefined;
}) {
  return (
    <ActivityFeeTokenValue
      value={value}
      symbol={token.symbol}
      tokenImageSource={getTokenImageSource({
        direction: 'out',
        symbol: token.symbol,
        assetId: token.assetId,
      })}
      networkImageSource={
        chainId ? getNetworkImageSource({ chainId }) : undefined
      }
    />
  );
}

/**
 * Network fee / bridge fee / total for a MetaMask Pay-routed transaction, from
 * the metadata {@link useActivityPayFiat} resolved. Rows with no recorded value
 * are omitted; a recorded zero still shows (`$0`).
 *
 * `networkFeeLabel` exists because Perps labels the same value "Transaction
 * fee" where Predict labels it "Network fee".
 */
export function ActivityDetailsPayFeesAndTotal({
  pay,
  networkFeeLabel = strings('activity_details.network_fee'),
}: {
  pay: MetamaskPayMetadata;
  networkFeeLabel?: string;
}) {
  const formatFiat = useFiatFormatter({ currency: PAY_FIAT_CURRENCY });
  const { networkFeeToken, bridgeFeeToken } = usePayFeeTokens(pay);

  // Callers get `pay` from `useActivityPayFiat`, which already screens this
  // out; the guard keeps a direct caller from rendering an empty section.
  if (!hasPayFiat(pay)) {
    return null;
  }

  const formatPayFiat = (value: string | undefined) =>
    value ? formatFiat(new BigNumber(value)) : undefined;

  const networkFee = formatPayFiat(pay.networkFeeFiat);
  const bridgeFee = formatPayFiat(pay.bridgeFeeFiat);

  return (
    <ActivityDetailSection>
      <ActivityDetailRow
        label={networkFeeLabel}
        value={
          networkFee ? (
            <PayFeeValue
              value={networkFee}
              token={networkFeeToken}
              chainId={pay.chainId}
            />
          ) : undefined
        }
        testID={ActivityDetailsSelectorsIDs.NETWORK_FEE_ROW}
      />
      <ActivityDetailRow
        label={strings('activity_details.bridge_fee')}
        value={
          bridgeFee ? (
            <PayFeeValue
              value={bridgeFee}
              token={bridgeFeeToken}
              chainId={pay.chainId}
            />
          ) : undefined
        }
        testID={ActivityDetailsSelectorsIDs.BRIDGE_FEE_ROW}
      />
      <ActivityDetailRow
        label={strings('activity_details.total_amount')}
        value={formatPayFiat(pay.totalFiat)}
        testID={ActivityDetailsSelectorsIDs.TOTAL_ROW}
      />
    </ActivityDetailSection>
  );
}
