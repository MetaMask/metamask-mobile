# Gacha / CollectorCrypt use cases

| Flow                                                    | Primary layer | Observable outcome                                                                      |
| ------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| Public catalogue → purchase → Snap signature → reveal   | Integration   | Provider request shapes and opaque transaction passthrough produce the owned card.      |
| Confirmed buyback with stale NFT indexer                | Integration   | Completed sale hides the card.                                                          |
| Submitted buyback → restart → collection reconciliation | Integration   | Card stays pending until confirmation; reconciliation does not sign or submit again.    |
| Interrupted reveal → restart → recovery                 | Integration   | The same paid pack opens without another purchase or signature.                         |
| Wallet reset during pack generation or signing          | Integration   | No stale state is restored and no signed transaction is submitted for the reset wallet. |
| Wallet reset while NFT sync is in flight                | Integration   | The stale sync is rejected and concurrent fresh calls share the new request.            |

Layer choice: these flows test Gacha controller/provider/service contracts, without screen rendering or device behavior. Unit tests retain exhaustive local transition and schema cases.
