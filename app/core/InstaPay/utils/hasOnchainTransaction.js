export function hasPendingTransaction(runtimeState) {
  const onchainTxTypes = [
    "deposit",
    "withdrawal",
    "collateral"
  ]
  let ans = false
  onchainTxTypes.forEach(type => {
    ans = runtimeState[type].submitted && !runtimeState[type].detected
  })
  return ans
}