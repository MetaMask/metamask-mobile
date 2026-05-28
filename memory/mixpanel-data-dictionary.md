# Mixpanel Data Dictionary

## PERPS_UI_INTERACTION

- `interaction_type`: add `related_market_clicked`.
- `section_viewed`: add `related_markets` for `interaction_type='slide'` on the asset details Related markets rail.
- `source_market`: source market ticker for `related_market_clicked`.
- `market`: destination market ticker for `related_market_clicked`.
- `category`: primary Collection/List identifier for `related_market_clicked`.
- `position`: 1-based tile position for `related_market_clicked`.

## PERPS_SCREEN_VIEWED

- `source`: add `related_markets` for destination `screen_type='asset_details'` views opened from the Related markets rail.
