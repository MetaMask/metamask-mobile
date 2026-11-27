# Collectibles data-service use cases

These are expected outcomes. Each feature change supplies its executable tests under `app/components/UI/Collectibles`.

| Flow                                                        | Primary test layer       |
| ----------------------------------------------------------- | ------------------------ |
| Shared UI/background query descriptors and coalesced reads  | Data-service integration |
| Normalized batch identifiers and transport requests         | Data-service integration |
| Cursor forwarding and page accumulation                     | Data-service integration |
| Account/environment cache isolation and reset cancellation  | Data-service integration |
| Tabs, loading states, unavailable states and command intent | Component view           |
| Purchases, buybacks, recovery and signing                   | PackPartner harness      |
