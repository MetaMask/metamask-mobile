# Local Collectibles search

Search filters the loaded pack catalogue, the selected account's owned cards (read
from PackPartner through `PackPartnerDataService`), Greatest Hits and public
inventory pages that are still in the UI cache from previously visited packs. It is not an exhaustive provider search:
visiting a pack can add searchable metadata, and cache eviction removes it.
Opening or typing in Search never loads pack inventories or Greatest Hits.
The catalogue and owned cards keep their own queries.

`useKnownPublicCards` subscribes to matching PackPartner inventory/ranking cache
updates and removals, with stable snapshots for React. It does not create query
observers or delay the existing cache collection policy. Clearing the cache on
wallet reset clears these results as well; unmount removes the subscription.

Inventory is public and scoped by provider and network, not by wallet. Owned
results and card actions come only from the current account's owned-cards read. A public result cannot establish ownership, even when another account
has held the same mint. The three current API services are complementary sources,
not interchangeable NFT providers.
