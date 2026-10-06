# Gacha / CollectorCrypt use cases

| Flow                                                          | Primary layer | Observable outcome                                                                                 |
| ------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| Public catalogue → purchase → Snap signature → reveal         | Integration   | Provider request shapes and opaque transaction passthrough produce the owned card.                 |
| Confirmed buyback with stale NFT indexer                      | Integration   | Completed sale hides the card.                                                                     |
| Invalid NFT indexer metadata → card sync                      | Integration   | The card syncs from CollectorCrypt holdings when the indexer item fails validation.                |
| Known NFT → null metadata with missing CollectorCrypt holding | Integration   | Incomplete indexer data cannot remove the previously owned card.                                   |
| Submitted buyback → restart → collection reconciliation       | Integration   | Card stays pending until confirmation; reconciliation does not sign or submit again.               |
| Pending buyback → status check from the card                  | Integration   | The check stays pending until confirmation, then completes without signing or submitting again.    |
| Interrupted reveal → restart → recovery                       | Integration   | The same paid pack opens without another purchase or signature.                                    |
| Confirmed payment → delayed webhook → restart after deadline  | Integration   | Confirmed payment remains paid until delivery or a confirmed refund.                               |
| Submission attempt → lost response → restart after deadline   | Integration   | The memo, signature and signed bytes remain recoverable without another payment.                   |
| Persisted snapshot → restart                                  | Integration   | The persisted submitted operation recovers without generating or submitting another payment.       |
| Buyback transaction → refund below confirmed amount           | Integration   | No transaction is signed; the updated offer is exposed for another confirmation.                   |
| Buyback quote → interrupted signature → restart               | Integration   | A known unsubmitted quote can be replaced even when it exists at the provider.                     |
| Wallet reset during pack generation or signing                | Integration   | No stale state is restored and no signed transaction is submitted for the reset wallet.            |
| Wallet reset while NFT sync is in flight                      | Integration   | The stale sync is rejected and concurrent fresh calls share the new request.                       |
| Onboarding completion → card sync across accounts             | Integration   | Provider synchronization preserves wallet-wide onboarding completion.                              |
| Manual collection refresh                                     | Hook unit     | The query calls sync with bypassCache and exposes loading/errors through the existing query state. |

Layer choice: these flows test Gacha controller/provider/service contracts, without screen rendering or device behavior. Unit tests retain exhaustive local transition and schema cases.
