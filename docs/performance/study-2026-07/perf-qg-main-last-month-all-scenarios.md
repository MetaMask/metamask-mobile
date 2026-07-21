# Performance scenarios on `main` — last 30 days

- **Branch:** `main`
- **Window:** 2026-06-15 → 2026-07-14 (UTC)
- **Completed runs:** 561
- **Unique scenarios with quality gates:** 20
- **Source:** `aggregated-reports` / `performance-results.json`

Pass/fail = quality-gate outcome (`qualityGates.passed`).
`fail_over_%` = how much the failing step exceeded its threshold (`percentOver`).
Mode is computed on `percentOver` rounded to 1 decimal.

## Summary table

| Scenario | Obs | Pass % | Fail % | Thr (ms) | Over% mean | Over% mode | Over% median | Fail dur mean |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Onboarding Import SRP with +50 accounts, SRP 3 | 542 | 41.0% | 59.0% | 1980 | 16.3 | 5.3 | 13.1 | 2276 |
| Account creation after fresh install | 423 | 63.1% | 36.9% | 3300 | 92.7 | 77.7 | 95.8 | 5492 |
| Cold Start after importing a wallet | 489 | 75.1% | 24.9% | 2200 | 73.2 | 4.2 | 37.2 | 3809 |
| Connect to Uniswap dapp, edit accounts, choose another account, and skip Solana popup | 494 | 77.5% | 22.5% | 24200 | 170.5 | 45.9 | 227.5 | 65459 |
| Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3 | 407 | 85.7% | 14.3% | 1870 | 100.2 | 3.2 | 22.7 | 4116 |
| Perps add funds | 705 | 86.1% | 13.9% | 3850 | 43.5 | 0.5 | 27.4 | 6827 |
| Seedless Onboarding: Apple Login New User | 638 | 88.6% | 11.4% | 6600 | 25.0 | 0.3 | 17.7 | 7416 |
| Cross-chain swap flow - ETH to SOL - 50+ accounts, SRP 1 + SRP 2 + SRP 3 | 629 | 89.0% | 11.0% | 2420 | 35.2 | 13.0 | 22.2 | 4047 |
| Seedless Onboarding: Google Login New User | 641 | 91.4% | 8.6% | 5500 | 27.6 | 35.7 | 25.2 | 6814 |
| Perps open position and close it | 415 | 92.8% | 7.2% | 15400 | 18.0 | 1.3 | 10.9 | 12025 |
| Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3 | 710 | 93.4% | 6.6% | 2750 | 19.8 | 1.1 | 14.6 | 3602 |
| Predict Deposit - Complete Flow Performance | 626 | 93.6% | 6.4% | 6600 | 37.6 | 8.8 | 33.5 | 10513 |
| Cold Start: Measure ColdStart To Login Screen | 715 | 94.1% | 5.9% | 4950 | 39.3 | 106.5 | 20.9 | 6893 |
| Measure Warm Start: Warm Start to Login Screen | 607 | 95.7% | 4.3% | 3300 | 383.8 | 27.5 | 433.5 | 15966 |
| Measure Warm Start: Login To Wallet Screen | 630 | 96.3% | 3.7% | 2750 | 15.9 | 4.9 | 9.4 | 3372 |
| Predict Market Details - Complete Flow Performance | 701 | 96.4% | 3.6% | 4400 | 30.0 | 2.3 | 32.0 | 6312 |
| Measure Cold Start To Onboarding Screen | 715 | 98.7% | 1.3% | 4400 | 29.4 | 30.2 | 5.5 | 5692 |
| Aggregated Balance Loading Time, SRP 1 + SRP 2 + SRP 3 | 706 | 99.4% | 0.6% | 22000 | 59.6 | 139.2 | 44.6 | 35109 |
| Asset View, SRP 1 + SRP 2 + SRP 3 | 709 | 99.7% | 0.3% | 7150 | 4.1 | 7.1 | 4.1 | 7441 |
| Predict Available Balance - Complete Flow Performance | 716 | 100.0% | 0.0% | 5500 | - | - | - | - |

## Onboarding Import SRP with +50 accounts, SRP 3

- Observations: **542**
- Pass: **222** (41.0%) · Fail: **320** (59.0%)
- Primary threshold (most common on failures / steps): **1980 ms**
- Thresholds seen: `{1980: 983, 2200: 682, 1650: 875, 5500: 542, 3300: 542}`
- On failures — over%: mean=16.3, mode=5.3, median=13.1, min=0.1, max=68.7 (n=320)
- Step thresholds:
  - `1980 ms` — Time since the user clicks on "Create new wallet" button until "Social sign up" is visible
  - `2200 ms` — Time since the user clicks on "Import using SRP" button until SRP field is displayed
  - `1650 ms` — Time since the user clicks on "Continue" button on SRP screen until Password fields are visible
  - `1980 ms` — Time since the user clicks on "Create Password" button until Metrics screen is displayed
  - `5500 ms` — Time since the user clicks on "Done" button until ETH and BTC are visible
  - `3300 ms` — Time since the user clicks on "Done" button until feature sheet is visible
  - `1650 ms` — Time since the user clicks on "I agree" button on Metrics screen until Onboarding Success screen is visible
- By device:
  - Google Pixel 8 Pro+14.0: pass 28.2% (124) / fail 71.8% (315)
  - Samsung Galaxy S25 Ultra+15.0: pass 95.1% (98) / fail 4.9% (5)

## Account creation after fresh install

- Observations: **423**
- Pass: **267** (63.1%) · Fail: **156** (36.9%)
- Primary threshold (most common on failures / steps): **3300 ms**
- Thresholds seen: `{2200: 846, 3300: 423}`
- On failures — over%: mean=92.7, mode=77.7, median=95.8, min=1.4, max=241.7 (n=156)
- Step thresholds:
  - `2200 ms` — Time since the user clicks on "Account list" button until the account list is visible
  - `2200 ms` — Time since the user clicks on "Create account" button until the account is in the account list
  - `3300 ms` — Time since the user clicks on new account created until the Token list is visible
- By device:
  - Google Pixel 8 Pro+14.0: pass 60.0% (189) / fail 40.0% (126)
  - Samsung Galaxy S25 Ultra+15.0: pass 72.2% (78) / fail 27.8% (30)

## Cold Start after importing a wallet

- Observations: **489**
- Pass: **367** (75.1%) · Fail: **122** (24.9%)
- Primary threshold (most common on failures / steps): **2200 ms**
- Thresholds seen: `{2200: 362, 1650: 127}`
- On failures — over%: mean=73.2, mode=4.2, median=37.2, min=0.5, max=323.1 (n=122)
- Step thresholds:
  - `2200 ms` — Time since the user clicks on unlock button, until the app unlocks
- By device:
  - Google Pixel 8 Pro+14.0: pass 70.8% (257) / fail 29.2% (106)
  - Samsung Galaxy S25 Ultra+15.0: pass 87.3% (110) / fail 12.7% (16)

## Connect to Uniswap dapp, edit accounts, choose another account, and skip Solana popup

- Observations: **494**
- Pass: **383** (77.5%) · Fail: **111** (22.5%)
- Primary threshold (most common on failures / steps): **24200 ms**
- Thresholds seen: `{24200: 494, 5500: 494}`
- On failures — over%: mean=170.5, mode=45.9, median=227.5, min=0.2, max=408.8 (n=111)
- Step thresholds:
  - `24200 ms` — Time since the user selects Metamask until Metamask app is opened
  - `5500 ms` — Time since the user taps Connect in MetaMask until Uniswap is displayed
- By device:
  - Google Pixel 8 Pro+14.0: pass 75.9% (274) / fail 24.1% (87)
  - Samsung Galaxy S25 Ultra+15.0: pass 82.0% (109) / fail 18.0% (24)

## Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3

- Observations: **407**
- Pass: **349** (85.7%) · Fail: **58** (14.3%)
- Primary threshold (most common on failures / steps): **1870 ms**
- Thresholds seen: `{3300: 407, 1320: 407, 1870: 407, 2200: 407}`
- On failures — over%: mean=100.2, mode=3.2, median=22.7, min=0.1, max=311.7 (n=58)
- Step thresholds:
  - `3300 ms` — Time since the user clicks on "Account list" button until the account list is visible
  - `1320 ms` — Time since the user clicks on "Add account" button until the next modal is visible
  - `1870 ms` — Time since the user clicks on "Import SRP" button until SRP field is displayed
  - `2200 ms` — Time since the user clicks on "Continue" button on SRP screen until Wallet main screen is visible
- By device:
  - Google Pixel 8 Pro+14.0: pass 81.4% (240) / fail 18.6% (55)
  - Samsung Galaxy S25 Ultra+15.0: pass 97.3% (109) / fail 2.7% (3)

## Perps add funds

- Observations: **705**
- Pass: **607** (86.1%) · Fail: **98** (13.9%)
- Primary threshold (most common on failures / steps): **3850 ms**
- Thresholds seen: `{4620: 705, 3850: 705, 7700: 705}`
- On failures — over%: mean=43.5, mode=0.5, median=27.4, min=0.0, max=293.0 (n=98)
- Step thresholds:
  - `4620 ms` — Select Perps Main Screen
  - `3850 ms` — Open Add Funds
  - `7700 ms` — Get Quote
- By device:
  - Google Pixel 8 Pro+14.0: pass 82.4% (427) / fail 17.6% (91)
  - Samsung Galaxy S25 Ultra+15.0: pass 96.3% (180) / fail 3.7% (7)

## Seedless Onboarding: Apple Login New User

- Observations: **638**
- Pass: **565** (88.6%) · Fail: **73** (11.4%)
- Primary threshold (most common on failures / steps): **6600 ms**
- Thresholds seen: `{2200: 638, 6600: 1276, 5500: 1276}`
- On failures — over%: mean=25.0, mode=0.3, median=17.7, min=0.0, max=133.9 (n=73)
- Step thresholds:
  - `2200 ms` — Apple: Tap "Create new wallet" → OnboardingSheet visible
  - `6600 ms` — Apple: Tap Apple login → post-OAuth screen visible
  - `6600 ms` — Apple: Tap "Create Password" → Onboarding Success visible
  - `5500 ms` — Apple: Tap "Done" → feature sheet visible
  - `5500 ms` — Apple: Dismiss feature sheet → wallet main screen visible
- By device:
  - Google Pixel 8 Pro+14.0: pass 87.7% (406) / fail 12.3% (57)
  - Samsung Galaxy S25 Ultra+15.0: pass 90.9% (159) / fail 9.1% (16)

## Cross-chain swap flow - ETH to SOL - 50+ accounts, SRP 1 + SRP 2 + SRP 3

- Observations: **629**
- Pass: **560** (89.0%) · Fail: **69** (11.0%)
- Primary threshold (most common on failures / steps): **2420 ms**
- Thresholds seen: `{2420: 629, 7700: 629}`
- On failures — over%: mean=35.2, mode=13.0, median=22.2, min=2.6, max=226.7 (n=69)
- Step thresholds:
  - `2420 ms` — Time since the user clicks on the "Swap" button until the swap page is loaded
  - `7700 ms` — Time since the user enters the amount until the quote is displayed
- By device:
  - Google Pixel 8 Pro+14.0: pass 85.7% (397) / fail 14.3% (66)
  - Samsung Galaxy S25 Ultra+15.0: pass 98.2% (163) / fail 1.8% (3)

## Seedless Onboarding: Google Login New User

- Observations: **641**
- Pass: **586** (91.4%) · Fail: **55** (8.6%)
- Primary threshold (most common on failures / steps): **5500 ms**
- Thresholds seen: `{2200: 641, 5500: 1923, 6600: 641}`
- On failures — over%: mean=27.6, mode=35.7, median=25.2, min=0.3, max=99.6 (n=55)
- Step thresholds:
  - `2200 ms` — Google: Tap "Create new wallet" → OnboardingSheet visible
  - `5500 ms` — Google: Tap Google login → post-OAuth screen visible
  - `6600 ms` — Google: Tap "Create Password" → Onboarding Success visible
  - `5500 ms` — Google: Tap "Done" → feature sheet visible
  - `5500 ms` — Google: Dismiss feature sheet → wallet main screen visible
- By device:
  - Google Pixel 8 Pro+14.0: pass 90.8% (424) / fail 9.2% (43)
  - Samsung Galaxy S25 Ultra+15.0: pass 93.1% (162) / fail 6.9% (12)

## Perps open position and close it

- Observations: **415**
- Pass: **385** (92.8%) · Fail: **30** (7.2%)
- Primary threshold (most common on failures / steps): **15400 ms**
- Thresholds seen: `{2200: 415, 6600: 415, 5500: 415, 15400: 415, 3300: 160, 2750: 255}`
- On failures — over%: mean=18.0, mode=1.3, median=10.9, min=0.5, max=74.6 (n=30)
- Step thresholds:
  - `2200 ms` — Perps tutorial screen visible
  - `6600 ms` — Market list screen visible
  - `5500 ms` — Open Order Screen
  - `15400 ms` — Position opened
  - `2750 ms` — Market Details Screen
- By device:
  - Google Pixel 8 Pro+14.0: pass 92.2% (270) / fail 7.8% (23)
  - Samsung Galaxy S25 Ultra+15.0: pass 94.3% (115) / fail 5.7% (7)

## Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3

- Observations: **710**
- Pass: **663** (93.4%) · Fail: **47** (6.6%)
- Primary threshold (most common on failures / steps): **2750 ms**
- Thresholds seen: `{2750: 710, 7700: 710}`
- On failures — over%: mean=19.8, mode=1.1, median=14.6, min=0.9, max=84.0 (n=47)
- Step thresholds:
  - `2750 ms` — Time since the user clicks on the "Swap" button until the swap page is loaded
  - `7700 ms` — Time since the user enters the amount until the quote is displayed
- By device:
  - Google Pixel 8 Pro+14.0: pass 91.2% (475) / fail 8.8% (46)
  - Samsung Galaxy S25 Ultra+15.0: pass 99.5% (188) / fail 0.5% (1)

## Predict Deposit - Complete Flow Performance

- Observations: **626**
- Pass: **586** (93.6%) · Fail: **40** (6.4%)
- Primary threshold (most common on failures / steps): **6600 ms**
- Thresholds seen: `{8800: 626, 6600: 611, 13200: 626, 5500: 15}`
- On failures — over%: mean=37.6, mode=8.8, median=33.5, min=0.2, max=99.6 (n=40)
- Step thresholds:
  - `8800 ms` — Time since user taps Predict button until Predict Market List is displayed
  - `6600 ms` — Time since user taps Add Funds button until Predict Deposit screen is visible
  - `13200 ms` — Time since user taps Continue button until quote is displayed on confirmation page
- By device:
  - Google Pixel 8 Pro+14.0: pass 91.6% (416) / fail 8.4% (38)
  - Samsung Galaxy S25 Ultra+15.0: pass 98.8% (170) / fail 1.2% (2)

## Cold Start: Measure ColdStart To Login Screen

- Observations: **715**
- Pass: **673** (94.1%) · Fail: **42** (5.9%)
- Primary threshold (most common on failures / steps): **4950 ms**
- Thresholds seen: `{4950: 715}`
- On failures — over%: mean=39.3, mode=106.5, median=20.9, min=0.3, max=125.8 (n=42)
- Step thresholds:
  - `4950 ms` — Time since the the app is launched, until login screen appears
- By device:
  - Google Pixel 8 Pro+14.0: pass 92.0% (483) / fail 8.0% (42)
  - Samsung Galaxy S25 Ultra+15.0: pass 100.0% (190) / fail 0.0% (0)

## Measure Warm Start: Warm Start to Login Screen

- Observations: **607**
- Pass: **581** (95.7%) · Fail: **26** (4.3%)
- Primary threshold (most common on failures / steps): **3300 ms**
- Thresholds seen: `{3300: 607}`
- On failures — over%: mean=383.8, mode=27.5, median=433.5, min=16.5, max=637.7 (n=26)
- Step thresholds:
  - `3300 ms` — Time since the user open the app again and the login screen appears
- By device:
  - Google Pixel 8 Pro+14.0: pass 99.2% (475) / fail 0.8% (4)
  - Samsung Galaxy S25 Ultra+15.0: pass 82.8% (106) / fail 17.2% (22)

## Measure Warm Start: Login To Wallet Screen

- Observations: **630**
- Pass: **607** (96.3%) · Fail: **23** (3.7%)
- Primary threshold (most common on failures / steps): **2750 ms**
- Thresholds seen: `{3300: 329, 2750: 301}`
- On failures — over%: mean=15.9, mode=4.9, median=9.4, min=0.5, max=91.9 (n=23)
- Step thresholds:
  - `3300 ms` — Time since the user clicks on unlock button, until the app unlocks
- By device:
  - Google Pixel 8 Pro+14.0: pass 95.5% (466) / fail 4.5% (22)
  - Samsung Galaxy S25 Ultra+15.0: pass 99.3% (141) / fail 0.7% (1)

## Predict Market Details - Complete Flow Performance

- Observations: **701**
- Pass: **676** (96.4%) · Fail: **25** (3.6%)
- Primary threshold (most common on failures / steps): **4400 ms**
- Thresholds seen: `{5500: 701, 7150: 701, 2750: 701, 4400: 701}`
- On failures — over%: mean=30.0, mode=2.3, median=32.0, min=0.4, max=60.3 (n=25)
- Step thresholds:
  - `5500 ms` — Time since user taps Predict button until Predict Market List is displayed
  - `7150 ms` — Time since user taps market card until Market Detail screen is visible
  - `2750 ms` — Time since user taps About tab until About tab is visible
  - `4400 ms` — Time since user taps Outcomes tab until Outcomes tab is visible
- By device:
  - Google Pixel 8 Pro+14.0: pass 95.1% (489) / fail 4.9% (25)
  - Samsung Galaxy S25 Ultra+15.0: pass 100.0% (187) / fail 0.0% (0)

## Measure Cold Start To Onboarding Screen

- Observations: **715**
- Pass: **706** (98.7%) · Fail: **9** (1.3%)
- Primary threshold (most common on failures / steps): **4400 ms**
- Thresholds seen: `{4400: 715}`
- On failures — over%: mean=29.4, mode=30.2, median=5.5, min=0.0, max=147.6 (n=9)
- Step thresholds:
  - `4400 ms` — Time since the the app is installed, until onboarding screen appears
- By device:
  - Google Pixel 8 Pro+14.0: pass 98.3% (516) / fail 1.7% (9)
  - Samsung Galaxy S25 Ultra+15.0: pass 100.0% (190) / fail 0.0% (0)

## Aggregated Balance Loading Time, SRP 1 + SRP 2 + SRP 3

- Observations: **706**
- Pass: **702** (99.4%) · Fail: **4** (0.6%)
- Primary threshold (most common on failures / steps): **22000 ms**
- Thresholds seen: `{22000: 706}`
- On failures — over%: mean=59.6, mode=139.2, median=44.6, min=9.8, max=139.2 (n=4)
- Step thresholds:
  - `22000 ms` — Time since the user navigates to wallet tab until the balance stabilizes
- By device:
  - Google Pixel 8 Pro+14.0: pass 99.4% (514) / fail 0.6% (3)
  - Samsung Galaxy S25 Ultra+15.0: pass 99.5% (188) / fail 0.5% (1)

## Asset View, SRP 1 + SRP 2 + SRP 3

- Observations: **709**
- Pass: **707** (99.7%) · Fail: **2** (0.3%)
- Primary threshold (most common on failures / steps): **7150 ms**
- Thresholds seen: `{7150: 709}`
- On failures — over%: mean=4.1, mode=7.1, median=4.1, min=1.1, max=7.1 (n=2)
- Step thresholds:
  - `7150 ms` — Time since the user clicks on the asset view button until the user sees the token overview screen
- By device:
  - Google Pixel 8 Pro+14.0: pass 99.6% (517) / fail 0.4% (2)
  - Samsung Galaxy S25 Ultra+15.0: pass 100.0% (190) / fail 0.0% (0)

## Predict Available Balance - Complete Flow Performance

- Observations: **716**
- Pass: **716** (100.0%) · Fail: **0** (0.0%)
- Primary threshold (most common on failures / steps): **5500 ms**
- Thresholds seen: `{5500: 716}`
- On failures — over%: n/a (no QG failures or no percentOver)
- Step thresholds:
  - `5500 ms` — Time since user taps Predict button until Available Balance is displayed
- By device:
  - Google Pixel 8 Pro+14.0: pass 100.0% (526) / fail 0.0% (0)
  - Samsung Galaxy S25 Ultra+15.0: pass 100.0% (190) / fail 0.0% (0)
