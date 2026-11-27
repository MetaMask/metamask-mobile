# Collectibles data-service use cases

These are expected outcomes. Each feature change supplies its executable tests under `app/components/UI/Collectibles`.

| Flow                                                                            | Primary test layer       |
| ------------------------------------------------------------------------------- | ------------------------ |
| Shared UI/background query descriptors and coalesced reads                      | Data-service integration |
| Normalized batch identifiers and transport requests                             | Data-service integration |
| Cursor forwarding and page accumulation                                         | Data-service integration |
| Account/environment cache isolation and reset cancellation                      | Data-service integration |
| Social command responses refresh observed feeds, details, comments and profiles | Data-service integration |
| Unrelated viewer scopes and query families remain cached                        | Data-service integration |
| Rejected mutations are not retried or invalidated                               | Data-service integration |
| Failed refresh after a successful mutation does not reject the command          | Data-service integration |
| Tabs, loading states, unavailable states and command intent                     | Component view           |
| Purchases, buybacks, recovery and signing                                       | PackPartner harness      |
