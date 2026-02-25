import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { isSafeChainId, toHex } from '@metamask/controller-utils';
import type { NetworkConfiguration } from '@metamask/network-controller';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectUseSafeChainsListValidation } from '../../../../../selectors/preferencesController';
import { jsonRpcRequest } from '../../../../../util/jsonRpcRequest';
import { isPrefixedFormattedHexString } from '../../../../../util/number';
import {
  isValidNetworkName,
  isWhitelistedSymbol,
} from '../../../../../util/networks';
import { regex } from '../../../../../util/regex';
import Logger from '../../../../../util/Logger';
import AppConstants from '../../../../../core/AppConstants';
import { strings } from '../../../../../../locales/i18n';
import { templateInfuraRpc } from '../NetworkDetailsView.utils';
import { NETWORK_TO_NAME_MAP } from '../../../../../core/Engine/constants';
import type { SafeChain } from '../../../../hooks/useSafeChains';
import type {
  NetworkFormState,
  ValidationState,
} from '../NetworkDetailsView.types';

export interface UseNetworkValidationReturn extends ValidationState {
  validateChainId: (form: NetworkFormState) => Promise<void>;
  validateChainIdOnSubmit: (
    formChainId: string,
    parsedChainId: string,
    rpcUrl: string,
  ) => Promise<boolean>;
  validateSymbol: (
    form: NetworkFormState,
    chainToMatch?: SafeChain | null,
  ) => void;
  validateName: (
    form: NetworkFormState,
    chainToMatch?: SafeChain | null,
  ) => void;
  validateRpcAndChainId: (form: NetworkFormState) => void;
  disabledByChainId: (form: NetworkFormState) => boolean;
  disabledBySymbol: (form: NetworkFormState) => boolean;
  checkIfChainIdExists: (chainId: string) => boolean;
  checkIfNetworkExists: (rpcUrl: string) => Promise<NetworkConfiguration[]>;
  checkIfRpcUrlExists: (rpcUrl: string) => Promise<NetworkConfiguration[]>;
  setWarningRpcUrl: (value: string | undefined) => void;
  setWarningChainId: (value: string | undefined) => void;
  onRpcUrlValidationChange: (isValid: boolean) => void;
  networkList: SafeChain | null;
}

export const useNetworkValidation = (): UseNetworkValidationReturn => {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  const [warningRpcUrl, setWarningRpcUrl] = useState<string | undefined>(
    undefined,
  );
  const [warningChainId, setWarningChainId] = useState<string | undefined>(
    undefined,
  );
  const [warningSymbol, setWarningSymbol] = useState<string | undefined>(
    undefined,
  );
  const [warningName, setWarningName] = useState<string | undefined>(undefined);
  const [validatedRpcURL, setValidatedRpcURL] = useState(true);
  const [validatedChainId, setValidatedChainId] = useState(true);
  const [validatedSymbol, setValidatedSymbol] = useState(true);
  const [networkList] = useState<SafeChain | null>(null);

  // ---- Existence checks ---------------------------------------------------
  const checkIfChainIdExists = useCallback(
    (chainId: string): boolean => {
      let hexChainId: string | null;
      try {
        hexChainId = toHex(chainId);
      } catch {
        hexChainId = null;
      }
      return Object.values(networkConfigurations).some(
        (item) => item.chainId === hexChainId,
      );
    },
    [networkConfigurations],
  );

  const checkIfRpcUrlExists = useCallback(
    async (rpcUrl: string): Promise<NetworkConfiguration[]> =>
      Object.values(networkConfigurations).filter((item) =>
        item.rpcEndpoints?.some((endpoint) => endpoint.url === rpcUrl),
      ),
    [networkConfigurations],
  );

  const checkIfNetworkExists = useCallback(
    async (rpcUrl: string): Promise<NetworkConfiguration[]> =>
      Object.values(networkConfigurations).filter(
        (item) =>
          item.rpcEndpoints?.[item.defaultRpcEndpointIndex]?.url === rpcUrl,
      ),
    [networkConfigurations],
  );

  // ---- RPC URL validation callback (from RpcUrlInput) ---------------------
  const onRpcUrlValidationChange = useCallback((isValid: boolean) => {
    setValidatedRpcURL(isValid);
  }, []);

  // ---- Chain ID validation ------------------------------------------------
  const validateChainId = useCallback(
    async (form: NetworkFormState) => {
      const { chainId, rpcUrl, editable } = form;

      const chainIdExists = chainId ? checkIfChainIdExists(chainId) : false;
      const networkExists = rpcUrl ? await checkIfRpcUrlExists(rpcUrl) : [];

      if (chainIdExists && networkExists.length > 0 && !editable) {
        setValidatedChainId(true);
        setWarningChainId(
          strings('app_settings.chain_id_associated_with_another_network'),
        );
        return;
      }

      if (chainIdExists && networkExists.length === 0 && !editable) {
        setValidatedChainId(true);
        setWarningChainId(strings('app_settings.network_already_exist'));
        return;
      }

      if (!chainId) {
        setWarningChainId(strings('app_settings.chain_id_required'));
        setValidatedChainId(true);
        return;
      }

      let errorMessage = '';
      if (chainId.startsWith('0x')) {
        if (!regex.validChainIdHex.test(chainId)) {
          errorMessage = strings('app_settings.invalid_hex_number');
        } else if (!isPrefixedFormattedHexString(chainId)) {
          errorMessage = strings(
            'app_settings.invalid_hex_number_leading_zeros',
          );
        }
      } else if (!regex.validChainId.test(chainId)) {
        errorMessage = strings('app_settings.invalid_number');
      } else if (chainId.startsWith('0')) {
        errorMessage = strings('app_settings.invalid_number_leading_zeros');
      }

      if (errorMessage) {
        setWarningChainId(errorMessage);
        setValidatedChainId(true);
        return;
      }

      if (!isSafeChainId(toHex(chainId))) {
        setWarningChainId(
          strings('app_settings.invalid_number_range', {
            maxSafeChainId: AppConstants.MAX_SAFE_CHAIN_ID,
          }),
        );
        setValidatedChainId(true);
        return;
      }

      let endpointChainId: string | undefined;
      let providerError: unknown;
      try {
        endpointChainId = await jsonRpcRequest(
          templateInfuraRpc(rpcUrl ?? ''),
          'eth_chainId',
        );
      } catch (err) {
        Logger.error(
          err as Error,
          'Failed to fetch the chainId from the endpoint.',
        );
        providerError = err;
      }

      if (providerError || typeof endpointChainId !== 'string') {
        setValidatedRpcURL(false);
        setWarningRpcUrl(strings('app_settings.unMatched_chain'));
        return;
      }

      if (endpointChainId !== toHex(chainId)) {
        setWarningRpcUrl(
          strings('app_settings.url_associated_to_another_chain_id'),
        );
        setValidatedRpcURL(false);
        setWarningChainId(strings('app_settings.unMatched_chain_name'));
        return;
      }

      // Validation passed – trigger RPC+ChainId cross-validation
      setWarningChainId(undefined);
      setValidatedChainId(true);
    },
    [checkIfChainIdExists, checkIfRpcUrlExists],
  );

  // ---- Chain ID validation on submit (makes RPC call) --------------------
  const validateChainIdOnSubmit = useCallback(
    async (
      formChainId: string,
      parsedChainId: string,
      rpcUrl: string,
    ): Promise<boolean> => {
      let errorMessage: string | undefined;
      let endpointChainId: string | undefined;
      let providerError: unknown;

      try {
        endpointChainId = await jsonRpcRequest(
          templateInfuraRpc(rpcUrl),
          'eth_chainId',
        );
      } catch (err) {
        Logger.error(
          err as Error,
          'Failed to fetch the chainId from the endpoint.',
        );
        providerError = err;
      }

      if (providerError || typeof endpointChainId !== 'string') {
        errorMessage = strings('app_settings.failed_to_fetch_chain_id');
      } else if (parsedChainId !== endpointChainId) {
        if (!formChainId.startsWith('0x')) {
          try {
            const endpointChainIdNumber = new BigNumber(endpointChainId, 16);
            if (endpointChainIdNumber.isNaN()) {
              throw new Error('Invalid endpointChainId');
            }
            endpointChainId = endpointChainIdNumber.toString(10);
          } catch (err) {
            Logger.error(err as Error, {
              endpointChainId,
              message: 'Failed to convert endpoint chain ID to decimal',
            });
          }
        }
        errorMessage = strings(
          'app_settings.endpoint_returned_different_chain_id',
          { chainIdReturned: endpointChainId },
        );
      }

      if (errorMessage) {
        setWarningChainId(errorMessage);
        return false;
      }
      return true;
    },
    [],
  );

  // ---- Symbol validation --------------------------------------------------
  const validateSymbol = useCallback(
    (form: NetworkFormState, chainToMatch: SafeChain | null = null) => {
      const { ticker, chainId } = form;
      const networkConfiguration = chainId
        ? networkConfigurations[chainId as `0x${string}`]
        : undefined;
      const networkConfigurationSymbol = networkConfiguration?.nativeCurrency;

      if (isWhitelistedSymbol(chainId ?? '', ticker ?? '')) {
        setWarningSymbol(undefined);
        setValidatedSymbol(!!ticker);
        return;
      }

      if (!useSafeChainsListValidation) return;

      const symbol =
        networkConfigurationSymbol ||
        ((chainToMatch
          ? chainToMatch.nativeCurrency?.symbol
          : networkList?.nativeCurrency?.symbol) ??
          undefined);

      const symbolToUse =
        symbol?.toLowerCase() === ticker?.toLowerCase() ? undefined : symbol;

      setWarningSymbol(
        ticker && ticker !== symbolToUse ? symbolToUse : undefined,
      );
      setValidatedSymbol(!!ticker);
    },
    [networkConfigurations, useSafeChainsListValidation, networkList],
  );

  // ---- Name validation ----------------------------------------------------
  const validateName = useCallback(
    (form: NetworkFormState, chainToMatch: SafeChain | null = null) => {
      const { nickname, chainId } = form;
      if (!useSafeChainsListValidation) return;

      const name =
        NETWORK_TO_NAME_MAP[chainId as keyof typeof NETWORK_TO_NAME_MAP] ||
        chainToMatch?.name ||
        networkList?.name ||
        null;

      const nameToUse = isValidNetworkName(chainId ?? '', name, nickname ?? '')
        ? undefined
        : name;

      setWarningName(nameToUse);
    },
    [useSafeChainsListValidation, networkList],
  );

  // ---- Cross-validate RPC + Chain ID (matched chain list) -----------------
  const validateRpcAndChainId = useCallback(
    (form: NetworkFormState) => {
      // This is a no-op placeholder; in the original component,
      // matchedChainNetwork (from withIsOriginalNativeToken HOC) was used here.
      // The validation hook caller should integrate useSafeChains if needed.
      validateName(form);
      validateSymbol(form);
    },
    [validateName, validateSymbol],
  );

  // ---- Disabled checks ----------------------------------------------------
  const disabledByChainId = useCallback(
    (form: NetworkFormState): boolean => {
      const { chainId } = form;
      return (
        !chainId ||
        (!!chainId && (!validatedChainId || warningChainId !== undefined))
      );
    },
    [validatedChainId, warningChainId],
  );

  const disabledBySymbol = useCallback(
    (form: NetworkFormState): boolean => !form.ticker,
    [],
  );

  return {
    warningRpcUrl,
    warningChainId,
    warningSymbol,
    warningName,
    validatedRpcURL,
    validatedChainId,
    validatedSymbol,
    validateChainId,
    validateChainIdOnSubmit,
    validateSymbol,
    validateName,
    validateRpcAndChainId,
    disabledByChainId,
    disabledBySymbol,
    checkIfChainIdExists,
    checkIfNetworkExists,
    checkIfRpcUrlExists,
    setWarningRpcUrl,
    setWarningChainId,
    onRpcUrlValidationChange,
    networkList,
  };
};
