import useRedeemableWallet from './useRedeemableWallet';

const useCashbackWallet = () => {
  const {
    wallet,
    isLoading,
    error,
    fetchWallet,
    estimation,
    isEstimating,
    estimationError,
    fetchEstimation,
    withdraw,
    isWithdrawing,
    withdrawError,
    txHash,
    monitoringStatus,
    monitoringError,
    resetWithdraw,
  } = useRedeemableWallet('cashback');

  return {
    cashbackWallet: wallet,
    isLoading,
    error,
    fetchCashbackWallet: fetchWallet,

    estimation,
    isEstimating,
    estimationError,
    fetchEstimation,

    withdraw,
    isWithdrawing,
    withdrawError,
    txHash,

    monitoringStatus,
    monitoringError,
    resetWithdraw,
  };
};

export default useCashbackWallet;
