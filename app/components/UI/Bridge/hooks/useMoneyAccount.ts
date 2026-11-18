// UTILS NEEDED FOR BRIDGE PAGE

// Show Money in src asset list
//  wire up money account balance to useLatestBalance
//  wire up money account balance to asset list
// if Money is src, show money account balance but quoteRequest should be for EVM account
// selected as src - balance, disable fiat switch, enable token switch
// asset search - should only show money account if search query is 'money' or none

// Show Money in dest asset list
// if Money is dest, set quoteRequest destWallet to money account address
// set default src and dest token for Money src, current default has limited quote support
// selected as dest - balance, enable token switch

// QuoteCard
//   show quote without recipient

// EDGE CASES
// First-time Money interaction
// - Auto upgrade money account on submit
// Money to monMUSD
// - show quote + enable CTA button if swap not required
// Long-running txs
// - should be able to swap/depositu when wallet is locked (KeyringController exits early rn)

// TODO test submission
// TEST non bridge + withdraw
// TODO hardware wallet handling
// TODO activity list - what if withdraw fails? what if only deposit fails?
// TODO validate what happens if dest changes from Money to regular to non EVM etc, dest wallet address should match
// TODO prevent Money to Money swap
// TODO exclude money account asset from bridge-api token request
