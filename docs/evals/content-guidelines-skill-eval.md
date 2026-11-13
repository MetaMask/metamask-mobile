# Content guidelines skill eval

Do not merge. This report answers whether coding agents load the MetaMask content guidelines skill on their own when they write user-facing copy, or whether they need the "User-facing copy" section in `AGENTS.md`.

Question from George Marshall and Michael Ganchas. No comments were posted on GitHub or Slack.

## Recommendation

The `AGENTS.md` pointer is not what makes these agents follow the skill. GPT 5.5 medium loaded the skill on every copy prompt with and without the pointer (6/6 both ways). Grok 4.7 medium loaded it on 5/6 copy prompts without the pointer and 6/6 with it. The only prompt the pointer changed was a one-word typo fix. Claude Sonnet 5.5 medium never opened the skill file, in 12 copy runs and 2 control runs, including every run whose `AGENTS.md` told it to read `.claude/skills/mms-content-guidelines/SKILL.md` before changing a user-facing string. The copy failures sit in those Claude runs: a confirmation title with a question mark, and balance errors that name the problem and give no next step. A description tweak can cover the typo miss. It will not fix a model that does not open skills even when `AGENTS.md` names the file.

## Skill-call rate on copy prompts

Six copy prompts, one run each. The control prompt is excluded here and reported below. "Called" means the transcript shows a tool call that opened `mms-content-guidelines` (every hit was `.claude/skills/mms-content-guidelines/SKILL.md`).

| Model | Without pointer | With pointer |
| --- | --- | --- |
| Claude Sonnet 5.5 medium | 0/6 | 0/6 |
| GPT 5.5 medium | 6/6 | 6/6 |
| Grok 4.7 medium | 5/6 | 6/6 |

Control (refactor a hook, no strings): 0/6 skill calls. No model opened the skill when the task had no user-facing copy, with or without the pointer.

## Results

Copy pass uses the rules named in the question: sentence case, "your" not "my" for the user's things, no question-mark title, an error says what happened and what to do, and the add-funds action is not called "deposit". "Successfully", "please", and "sorry" were also treated as failures. One run per cell.

| Prompt | Model | Variant | Skill called | Copy | Strings |
| --- | --- | --- | --- | --- | --- |
| P1 Swap amount over balance | Claude | no pointer | no | fail | `swaps.amount_exceeds_balance` = "Amount exceeds your balance" |
| P1 Swap amount over balance | Claude | pointer | no | fail | `swaps.amount_exceeds_balance` = "Amount is more than your balance" |
| P1 Swap amount over balance | GPT | no pointer | yes | pass | `swaps.amount_exceeds_balance` = "Not enough {{symbol}} available. Enter a lower amount." |
| P1 Swap amount over balance | GPT | pointer | yes | pass | `swaps.amount_exceeds_balance` = "Your {{symbol}} balance is too low. Enter a lower amount." |
| P1 Swap amount over balance | Grok | no pointer | yes | pass | `swaps.amount_higher_than_balance` = "This amount is higher than your balance. Enter a smaller amount." |
| P1 Swap amount over balance | Grok | pointer | yes | pass | `swaps.amount_exceeds_balance` = "This amount is higher than your balance. Enter a smaller amount." |
| P2 Money empty-state CTA | Claude | no pointer | no | pass | `money.onboarding.step_1.cta` = "Add money" |
| P2 Money empty-state CTA | Claude | pointer | no | pass | `money.onboarding.step_1.cta` = "Fund your account" |
| P2 Money empty-state CTA | GPT | no pointer | yes | pass | `money.onboarding.step_1.cta` = "Fund your account" |
| P2 Money empty-state CTA | GPT | pointer | yes | pass | `money.onboarding.step_1.cta` = "Fund your Money account" |
| P2 Money empty-state CTA | Grok | no pointer | yes | pass | `money.onboarding.step_1.cta` = "Fund Money account" |
| P2 Money empty-state CTA | Grok | pointer | yes | pass | `money.onboarding.step_1.cta` = "Add money" |
| P3 Card freeze toast | Claude | no pointer | no | pass | `card.card_home.manage_card_options.freeze_success` = "Your card is frozen" |
| P3 Card freeze toast | Claude | pointer | no | pass | `card.card_home.manage_card_options.freeze_success` = "Your card is frozen" |
| P3 Card freeze toast | GPT | no pointer | yes | pass | `card.card_home.manage_card_options.freeze_success` = "Card frozen" |
| P3 Card freeze toast | GPT | pointer | yes | pass | `card.card_home.manage_card_options.freeze_success` = "Card frozen" |
| P3 Card freeze toast | Grok | no pointer | yes | pass | `card.card_home.manage_card_options.freeze_success` = "Card frozen" |
| P3 Card freeze toast | Grok | pointer | yes | pass | `card.card_home.manage_card_options.freeze_success` = "Card frozen" |
| P4 Freeze confirmation | Claude | no pointer | no | fail | `freeze_confirm_title` = "Freeze this card?"; `freeze_confirm_button` = "Freeze card" |
| P4 Freeze confirmation | Claude | pointer | no | fail | `freeze_confirm_title` = "Freeze this card?"; `freeze_confirm_button` = "Freeze card" |
| P4 Freeze confirmation | GPT | no pointer | yes | pass | `freeze_confirm_title` = "Freeze card"; `freeze_confirm_button` = "Freeze" |
| P4 Freeze confirmation | GPT | pointer | yes | pass | `freeze_confirm_title` = "Freeze this card"; `freeze_confirm_button` = "Freeze" |
| P4 Freeze confirmation | Grok | no pointer | yes | pass | `freeze_confirm_title` = "Freeze your card"; `freeze_confirm_button` = "Freeze card" |
| P4 Freeze confirmation | Grok | pointer | yes | pass | `freeze_confirm_title` = "Freeze your card"; `freeze_confirm_button` = "Freeze" |
| P5 Typo in en.json | Claude | no pointer | no | pass | `notifications.modal.label_unstake_ready` = "Withdrawal ready" |
| P5 Typo in en.json | Claude | pointer | no | pass | `notifications.modal.label_unstake_ready` = "Withdrawal ready" |
| P5 Typo in en.json | GPT | no pointer | yes | pass | `notifications.modal.label_unstake_ready` = "Withdrawal ready" |
| P5 Typo in en.json | GPT | pointer | yes | pass | `notifications.modal.label_unstake_ready` = "Withdrawal ready" |
| P5 Typo in en.json | Grok | no pointer | no | pass | `notifications.modal.label_unstake_ready` = "Withdrawal ready" |
| P5 Typo in en.json | Grok | pointer | yes | pass | `notifications.modal.label_unstake_ready` = "Withdrawal ready" |
| P6 Failed transaction notification | Claude | no pointer | no | pass | `notifications.error_title` = "Transaction failed"; `notifications.error_body` = "Your transaction didn't go through. Try again." |
| P6 Failed transaction notification | Claude | pointer | no | fail | `notifications.error_title` = "Transaction failed"; `notifications.error_body` = "Your transaction couldn't be completed." |
| P6 Failed transaction notification | GPT | no pointer | yes | pass | `notifications.error_title` = "Transaction failed"; `notifications.error_body` = "This transaction didn't go through. Tap to view details." |
| P6 Failed transaction notification | GPT | pointer | yes | pass | `notifications.error_title` = "Transaction failed"; `notifications.error_body` = "Tap to view details" |
| P6 Failed transaction notification | Grok | no pointer | yes | pass | `notifications.error_title` = "Transaction failed"; `notifications.error_body` = "Your transaction didn’t go through. Tap to view it." |
| P6 Failed transaction notification | Grok | pointer | yes | pass | `notifications.error_title` = "Transaction failed"; `notifications.error_body` = "Your transaction didn’t go through. Try again." |
| P7 Hook refactor (control) | Claude | no pointer | no | n/a | no string changes |
| P7 Hook refactor (control) | Claude | pointer | no | n/a | no string changes |
| P7 Hook refactor (control) | GPT | no pointer | no | n/a | no string changes |
| P7 Hook refactor (control) | GPT | pointer | no | n/a | no string changes |
| P7 Hook refactor (control) | Grok | no pointer | no | n/a | no string changes |
| P7 Hook refactor (control) | Grok | pointer | no | n/a | no string changes |

Copy pass on the six copy prompts: Claude 4/6 without the pointer and 3/6 with it. GPT 6/6 both ways. Grok 6/6 both ways. The pointer did not improve copy. Claude's pointer run on P6 dropped the next step that the no-pointer run included.

P4 confirmation keys are under `card.card_home.manage_card_options`.

## Prompts where agents skipped the skill

Copy prompts, skill not opened:

- Every Claude copy run. P1, P2, P3, P4, P5, and P6, with and without the pointer.
- Grok, no pointer, P5 only. The task was fixing "Withdrawl ready". The same model opened the skill on that prompt when the pointer was present, and on the other five copy prompts without it.

The control never triggered a skill read. The description is not so broad that a string-free refactor pulls it in.

Claude did not open any `SKILL.md` or `RULE.md` in any of its 14 runs. That includes the pointer runs. The transcript does not include the system prompt, so this eval cannot prove the skill description was inside Claude's context. It can show that the same branch and harness led GPT and Grok to open the skill file, and that Claude did not open the file `AGENTS.md` names.

## Where copy broke

Failures, all Claude, none of which had opened the skill:

- P1, both variants. The error says the amount is too high and does not say what to do.
- P4, both variants. The confirmation title is "Freeze this card?". The skill says to avoid a question mark when a statement will do, and not to put one on a button or most calls to action. GPT and Grok, which had opened the skill, used statements ("Freeze card", "Freeze this card", "Freeze your card").
- P6, pointer only. "Your transaction couldn't be completed." says what happened and gives no next step. The no-pointer Claude run on the same prompt did include "Try again."

P3 started from "Card successfully frozen", which violates the skill's ban on "successfully". Every model removed it. Claude did that without opening the skill ("Your card is frozen"). GPT and Grok wrote the past participle "Card frozen".

P2 is a follow-through gap, not a rubric fail. The string was already "Add funds", which is the skill's name for that action. The prompt told the agent to change the label, and every model did, including the four GPT and Grok runs that had just opened the skill. None wrote "Deposit". New labels were "Add money", "Fund your account", "Fund your Money account", and "Fund Money account". The skill did not keep them on "Add funds" once the user asked for a rename.

P5 passed for everyone. "Withdrawal ready" is sentence case. Opening the skill was not required to fix that spelling.

No run used "deposit", "my" for the user's things, "please", or "sorry" in the strings above.

## Suggested skill-description tweak

The installed description already says to use the skill when writing or reviewing locale files, buttons, toasts, empty states, errors, and confirmations. That was enough for GPT on every copy prompt, including the typo, and for Grok on five of six.

Grok's miss was a one-word spelling fix, which looks like a mechanical edit rather than new copy. Add this sentence to the description:

> Also use when changing an existing user-facing string, including a one-word typo or spelling fix in `en.json` or `messages.json`.

Do not expect that sentence to move Claude. Claude never opened a skill file, and the `AGENTS.md` pointer, which is stronger than a description cue, also did not make it open this one. If Claude-class agents need the rules, the description and a short `AGENTS.md` pointer were both insufficient in this harness. An always-applied rule would be a different experiment. It was not tested here.

## Method

Two trees, same skill, only `AGENTS.md` differs.

- Skill source: [MetaMask/skills#221](https://github.com/MetaMask/skills/pull/221) head `5c60f3863be6afdb9e35efaf29709f4b53f5d9d2`. `skill.md` and `repos/metamask-mobile.md` match that commit. The PR is merged. The copy under test is the installer output, not the raw source file. `yarn skills --include ui/content-guidelines` wrote `mms-content-guidelines` to `.claude/skills/`, `.cursor/rules/` (`alwaysApply: false`), and `.agents/skills/`, with the mobile overlay appended. Those files were force-added so a fresh clone can see them. They are gitignored in normal development.
- Variant A, no pointer: `cursor/eval-no-pointer-d28f` at `3eea03794ba`, which is `origin/main` `60e74e728dd` plus the skill files. `AGENTS.md` is unchanged.
- Variant B, pointer: `cursor/eval-with-pointer-d28f` at `48c7be8ed91`, which is A plus the eight-line "User-facing copy" section from [metamask-mobile#39056](https://github.com/MetaMask/metamask-mobile/pull/39056). That section was applied onto current main. The PR branch itself is behind main, and using it would have mixed unrelated code drift into the comparison.
- Each cell was a new cloud VM starting from that remote branch, with the model set on the run. Agents were told not to commit, push, or open a pull request, and not to run yarn or tests. None of these runs opened a pull request.
- Models: `claude-sonnet-5-5-medium`, `gpt-5.5-medium`, `grok-4.7-medium`. One run per cell. No retries.

Prompts did not mention guidelines, style, tone, or the skill. Each asked for the smallest edit and for the final reply to list changed English strings as `key = "value"`.

1. P1. In `app/components/UI/Bridge/components/SwapsInputs/SwapsInputs.tsx`, show an inline error when the entered amount is greater than the token balance. Add a new string under `swaps` in `locales/languages/en.json`. Do not reuse `swaps.not_enough`.
2. P2. Rename `money.onboarding.step_1.cta` ("Add funds"), used from `MoneyHomeView.tsx`. Update tests that assert the old label.
3. P3. Rewrite `card.card_home.manage_card_options.freeze_success` ("Card successfully frozen"), shown from `showFreezeSuccessToast` in `useCardHomeActions.ts`. Keep the key and the toast call.
4. P4. Add `freeze_confirm_title` and `freeze_confirm_button` under `card.card_home.manage_card_options`, and show them before a card is frozen.
5. P5. Fix `notifications.modal.label_unstake_ready`, "Withdrawl ready". Do not change the key.
6. P6. Rewrite `notifications.error_title` ("Something went wrong") and add `notifications.error_body` for a failed transaction.
7. P7 control. Refactor `app/components/UI/Money/hooks/useMountEffect.ts` so the once-only guard is a named helper in the same file. Do not change behavior or any user-facing string.

## What this run could not do

- The Cursor CLI (`agent` 2026.11.11-b912975, installed from `https://cursor.com/install`) is not logged in. `agent status` reported authentication required. This environment has no `CURSOR_API_KEY` or `CURSOR_AUTH_TOKEN`, and `agent login` needs an interactive browser. The matrix was not run with `agent -p --model`. The fresh processes were cloud VMs with an explicit model, which is the path that could actually start.
- Same-machine subagents were checked and then not used for scores. They inherit this session's skill catalog, which was built before `mms-content-guidelines` existed, so they cannot discover the skill. A probe confirmed the catalog listed the base `mms-*` skills and not content guidelines.
- `yarn skills --include ui/content-guidelines` also rewrote the rest of the stable skill set on this machine. Those extra files are gitignored and were not committed. The eval VMs got the base skills from the environment image plus the force-added content-guidelines skill.
- Extension was not run. [metamask-extension#47681](https://github.com/MetaMask/metamask-extension/pull/47681) was read. It adds the same "User-facing copy" section, pointed at `app/_locales/en/messages.json`. There was no extension checkout here, the CLI could not be authenticated, and the mobile matrix used the run. There are no extension numbers in this report.
- One run per cell. A second sample could move the Grok typo result or any single Claude string. The Claude pattern is twelve misses, not one.

## Run ids

| Run | Agent id |
| --- | --- |
| P1 Claude no pointer | `bc-9edf1026-51ea-53b2-82c9-cc4d71c954c6` |
| P1 Claude pointer | `bc-f94801d5-0add-51d7-acca-78962405ceef` |
| P1 GPT no pointer | `bc-3033fa02-d689-53aa-ac25-26ad769dea0f` |
| P1 GPT pointer | `bc-dc1294e5-395b-5910-a196-4d24cdd65d96` |
| P1 Grok no pointer | `bc-f281f928-92a5-5947-a80a-b3e55f2e02c4` |
| P1 Grok pointer | `bc-08395cc9-dde5-52d2-894f-0c0214b8ee7d` |
| P2 Claude no pointer | `bc-cb94f01e-afd6-506a-b10c-1b39eacb5283` |
| P2 Claude pointer | `bc-e4d6dd70-9686-50d9-9997-bbd2106e37d7` |
| P2 GPT no pointer | `bc-95a79cca-5efd-5932-8529-0773e9b97888` |
| P2 GPT pointer | `bc-4eb793da-cbc4-5584-9ef0-9bee903f8275` |
| P2 Grok no pointer | `bc-c9422324-4255-5a56-834c-c83dad2edb76` |
| P2 Grok pointer | `bc-a7781caf-5b1a-5a9d-bc01-3475ffc4fc3d` |
| P3 Claude no pointer | `bc-b1579b73-07fb-5018-93ea-8c9176efaa31` |
| P3 Claude pointer | `bc-9e25ebae-f649-547e-b6f8-a2753f85129f` |
| P3 GPT no pointer | `bc-a1650565-0b23-56b3-8149-7c57b3ea55e0` |
| P3 GPT pointer | `bc-f26efe77-c988-5f3e-8a5a-d6262b3b8c91` |
| P3 Grok no pointer | `bc-2b4310fb-9bcf-5b78-87ad-187e52d69323` |
| P3 Grok pointer | `bc-4e0ae222-0a3e-55a0-8e66-2c1866c740c0` |
| P4 Claude no pointer | `bc-ddc6c2bd-78be-52b4-905d-8899cc1e9166` |
| P4 Claude pointer | `bc-cf2911bf-a0ae-59b3-b3f2-6577bae50c8c` |
| P4 GPT no pointer | `bc-54fd7bd3-8b9b-5271-bbe9-eb2f898ac403` |
| P4 GPT pointer | `bc-fe6d2b80-9f39-5c87-aaa5-f9d203f8e126` |
| P4 Grok no pointer | `bc-cde1e54f-4bc0-5682-b3ad-3eb9b0d2de7b` |
| P4 Grok pointer | `bc-0794acc3-86b0-59dd-a7a0-67fe1e4c777a` |
| P5 Claude no pointer | `bc-e716d732-e307-5c6e-85ba-9980fdd9f40b` |
| P5 Claude pointer | `bc-3e519bfd-634c-5ffa-87b6-8dee400d2451` |
| P5 GPT no pointer | `bc-af7ad6c4-2425-53cc-9157-463ab0d72b99` |
| P5 GPT pointer | `bc-1768878d-3a03-54f2-b644-2053c527724d` |
| P5 Grok no pointer | `bc-ff83540d-944c-55d4-96ff-97471a297b4b` |
| P5 Grok pointer | `bc-bedfcd76-5ce0-5dac-9e24-06f4c1d691d4` |
| P6 Claude no pointer | `bc-5a7ccc57-666b-5b26-a9b8-bc3bafafffe9` |
| P6 Claude pointer | `bc-0fcd1765-17b8-5f44-b578-96597230bc28` |
| P6 GPT no pointer | `bc-3e6aee1d-01e3-5b7a-bacc-a98b902ea5ab` |
| P6 GPT pointer | `bc-607f524f-367f-50d6-a0d5-c59d2458fbcf` |
| P6 Grok no pointer | `bc-3ae77d89-9c05-5856-b324-55b4acf2e65c` |
| P6 Grok pointer | `bc-f622ebe3-4abe-5768-9b03-595ffd53dab5` |
| P7 Claude no pointer | `bc-f6b5523d-456f-5d8c-a274-343f13909c8a` |
| P7 Claude pointer | `bc-f609d807-ca57-5198-9670-3ac38873d8bf` |
| P7 GPT no pointer | `bc-1aa67fb8-632a-5d70-93b6-c137b25bbeed` |
| P7 GPT pointer | `bc-0faf68e5-8b86-5129-b110-86d258ef40aa` |
| P7 Grok no pointer | `bc-e596087d-7d55-5487-9568-1d8f92649efc` |
| P7 Grok pointer | `bc-cf2713a0-f4ad-5e3d-be07-e7ddfc013b4b` |
