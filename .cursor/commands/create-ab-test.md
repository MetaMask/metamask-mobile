# Create A/B Test

Use the canonical A/B testing standard. Do not duplicate policy logic in this wrapper.

Required sources:

1. `.ai/skills/ab-testing-implementation/SKILL.md`
2. `.ai/skills/ab-testing-implementation/references/ab-testing-playbook.md`
3. `docs/ab-testing.md`

Execution requirements:

1. Follow the playbook workflow exactly.
2. Keep implementation aligned with `useABTest` and `active_ab_tests` standards.
3. Run compliance check:

```bash
bash .ai/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --staged
```

Required response sections:

1. `Implementation Checklist`
2. `Files To Modify`
3. `Analytics Payload Changes`
4. `Tests To Run`
5. `Compliance Check Result`
