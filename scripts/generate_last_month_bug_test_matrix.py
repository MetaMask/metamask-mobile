#!/usr/bin/env python3
"""Generate a bug-to-test matrix for MetaMask Mobile (last 30 days)."""

from __future__ import annotations

import datetime as dt
import json
import re
import subprocess
from collections import Counter
from pathlib import Path
from typing import Iterable

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

REPO = "MetaMask/metamask-mobile"
LOOKBACK_DAYS = 30
MAX_ISSUES = 1000

OUTPUT_DIR = Path("docs/bug-test-matrix")
MD_PATH = OUTPUT_DIR / "metamask-mobile-bugs-last-30-days.md"
XLSX_PATH = OUTPUT_DIR / "metamask-mobile-bugs-last-30-days.xlsx"


def run_gh_issue_list() -> list[dict]:
    cmd = [
        "gh",
        "issue",
        "list",
        "--repo",
        REPO,
        "--state",
        "all",
        "--limit",
        str(MAX_ISSUES),
        "--json",
        "number,title,createdAt,updatedAt,closedAt,state,labels,url,body",
    ]
    out = subprocess.check_output(cmd, text=True)
    return json.loads(out)


def clean_title(title: str) -> str:
    t = title.strip()
    t = re.sub(r"^\[[^\]]+\]\s*:?\s*", "", t)
    t = re.sub(r"^(bug|ui)\s*:\s*", "", t, flags=re.IGNORECASE)
    return t


def clean_markdown_text(text: str) -> str:
    if not text:
        return ""
    value = text
    value = re.sub(r"```.*?```", " ", value, flags=re.DOTALL)
    value = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"<img[^>]*>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"</?[^>]+>", " ", value)
    value = re.sub(r"`([^`]+)`", r"\1", value)
    value = value.replace("**", "").replace("__", "").replace("*", "").replace("_", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_header(value: str) -> str:
    text = value.strip().lower()
    text = re.sub(r"[_*`:#-]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_sections(body: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current = "__preamble__"
    sections[current] = []

    for raw_line in body.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        heading_match = re.match(r"^\s*#{1,6}\s+(.+?)\s*$", stripped)
        bold_heading_match = re.match(r"^\s*\*\*(.+?)\*\*\s*$", stripped)
        if heading_match:
            current = normalize_header(heading_match.group(1))
            sections.setdefault(current, [])
            continue
        if bold_heading_match:
            current = normalize_header(bold_heading_match.group(1))
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(stripped)

    return {k: "\n".join(v).strip() for k, v in sections.items()}


def first_non_empty(values: Iterable[str]) -> str:
    for value in values:
        if value and value.strip():
            return value.strip()
    return ""


def section_text(sections: dict[str, str], aliases: list[str]) -> str:
    aliases_norm = {normalize_header(a) for a in aliases}
    for key, value in sections.items():
        if normalize_header(key) in aliases_norm and value:
            return value
    return ""


def shorten(text: str, max_chars: int) -> str:
    clean = clean_markdown_text(text)
    if len(clean) <= max_chars:
        return clean
    return clean[: max_chars - 1].rstrip() + "…"


def extract_component_paths(body: str) -> list[str]:
    matches = re.findall(r"`([^`]+(?:/[A-Za-z0-9_.-]+)+)`", body)
    matches.extend(
        re.findall(
            r"\b(?:app|tests|ios|android|wdio)/[A-Za-z0-9_./-]+",
            body,
        )
    )
    normalized = []
    for item in matches:
        text = item.strip()
        if "/" in text and len(text) < 180:
            normalized.append(text)
    # Keep order while deduplicating.
    seen = set()
    ordered = []
    for path in normalized:
        if path not in seen:
            seen.add(path)
            ordered.append(path)
    return ordered


def severity_rank(severity_labels: list[str]) -> tuple[int, str]:
    if not severity_labels:
        return (99, "Unlabeled")
    # Pick the highest urgency if multiple labels exist.
    candidates = []
    for label in severity_labels:
        low = label.lower()
        if "sev0" in low:
            candidates.append((0, label))
        elif "sev1" in low:
            candidates.append((1, label))
        elif "sev2" in low or "sev-2" in low:
            candidates.append((2, label))
        elif "sev3" in low:
            candidates.append((3, label))
        else:
            candidates.append((50, label))
    candidates.sort(key=lambda x: x[0])
    return candidates[0]


def infer_component_hint(text: str) -> str:
    lowered = text.lower()
    rules = [
        (r"perps|predict", "Perps/Predict view components"),
        (r"nft|erc-721|collectible", "NFT detail/send confirmation views"),
        (r"token detail|asset detail|portfolio|balance|token", "Asset list/detail components"),
        (r"explore|trending|sites|browser", "Explore/Sites view components"),
        (r"network icon|network switcher|chain", "Network switcher / chain badge components"),
        (r"copy address|clipboard|paste", "Input/copy interaction components"),
        (r"swap|bridge|quote|gas", "Swap/Bridge quote and review views"),
        (r"onboard|onboarding|import wallet|srp|recovery phrase", "Onboarding flow views"),
        (r"hardware wallet|ledger|trezor|qr scanner|scan", "Hardware wallet scanner/connect views"),
        (r"transaction|confirm|approval|signature", "Transaction confirmation views"),
        (r"notification|push", "Notification center/badge components"),
    ]
    for pattern, hint in rules:
        if re.search(pattern, lowered):
            return hint
    return "Relevant screen/view component for the reported flow"


def infer_assertion(text: str) -> str:
    lowered = text.lower()
    if re.search(r"disappear|missing|invisible|no .*icon|not shown|doesn.?t show", lowered):
        return "Assert expected elements stay visible and all intended options/icons remain rendered."
    if re.search(r"wrong|incorrect|mismatch|different|other token|another token", lowered):
        return "Assert displayed identifiers/amounts/labels exactly match the selected source state."
    if re.search(r"unable to|cannot|can.?t|fails to|failing", lowered):
        return "Assert the user action completes successfully and the UI updates to the expected next state."
    if re.search(r"paste|clipboard", lowered):
        return "Assert pasted clipboard text is accepted and bound to the input/query state."
    if re.search(r"freeze|crash|stuck|hang", lowered):
        return "Assert no freeze/crash path and that controls remain interactive after the action."
    if re.search(r"timeout|transaction not found|error", lowered):
        return "Assert error state is explicit and retry/recovery controls are available."
    if re.search(r"spacing|padding|alignment|text differs|copy text", lowered):
        return "Assert UI copy/style tokens match spec and remain consistent across equivalent views."
    return "Assert the rendered state and behavior match expected outcome for the reported scenario."


def infer_mocks(text: str, component_hint: str) -> str:
    lowered = text.lower()
    base = f"Render {component_hint} with controller/store state fixtures."
    if re.search(r"swap|bridge|quote|gas|price|rate|fee", lowered):
        return (
            base
            + " Mock quote/fee API responses (success + edge case) and verify derived totals."
        )
    if re.search(r"nft|erc-721|token id|collectible", lowered):
        return base + " Mock NFT/token metadata and deterministic IDs for selection vs confirmation."
    if re.search(r"explore|search|paste|url|sites", lowered):
        return base + " Mock search providers and clipboard input events."
    if re.search(r"network|chain|icon", lowered):
        return base + " Mock multichain network metadata and icon mapping selectors."
    if re.search(r"hardware wallet|qr scanner|scan|camera", lowered):
        return base + " Mock scanner module output and permission state."
    if re.search(r"transaction|confirm|approval|signature", lowered):
        return base + " Mock transaction controller state transitions and error branches."
    return base + " Mock any async selector/API used by the flow."


def infer_needs_e2e(text: str) -> bool:
    lowered = text.lower()
    return bool(
        re.search(
            r"hardware wallet|qr scanner|camera|deeplink|deep link|walletconnect|"
            r"push notification|biometric|background|app launch|nfc|bluetooth|"
            r"permissions",
            lowered,
        )
    )


def extract_steps_snippet(steps_text: str, title_text: str) -> str:
    if not steps_text:
        return f"Trigger the user action described in '{title_text}'."
    step_source = re.sub(r"(\d+\.)", r"\n\1", steps_text)
    raw_lines = [clean_markdown_text(line) for line in step_source.splitlines()]
    lines = []
    for line in raw_lines:
        line = re.sub(r"^\d+[\).\s-]*", "", line).strip("- ").strip()
        if line and line not in {"_No response_", "No response", "TBD"}:
            lines.append(line)
    if not lines:
        return f"Trigger the user action described in '{title_text}'."
    return " -> ".join(lines[:3])


def build_problem_summary(title: str, sections: dict[str, str]) -> str:
    describe = section_text(
        sections,
        [
            "Describe the bug",
            "Bug Description",
            "Description",
            "Current Behavior",
        ],
    )
    expected = section_text(sections, ["Expected behavior", "Expected Behavior"])

    bits = [clean_title(title)]
    if describe:
        bits.append(shorten(describe, 220))
    elif expected:
        bits.append(f"Expected: {shorten(expected, 180)}")
    summary = " — ".join(bits)
    return shorten(summary, 340)


def markdown_escape(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", "<br>")


def build_rows(raw_issues: list[dict]) -> list[dict]:
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = now - dt.timedelta(days=LOOKBACK_DAYS)

    rows = []
    for issue in raw_issues:
        labels = [label["name"] for label in issue.get("labels") or []]
        if "type-bug" not in labels:
            continue
        created_at = dt.datetime.fromisoformat(issue["createdAt"].replace("Z", "+00:00"))
        if created_at < cutoff:
            continue

        teams = [name for name in labels if name.lower().startswith("team-")]
        sevs = [name for name in labels if name.lower().startswith("sev")]
        sev_priority, sev_top = severity_rank(sevs)

        body = issue.get("body") or ""
        sections = parse_sections(body)
        summary = build_problem_summary(issue["title"], sections)

        affected = section_text(
            sections,
            ["Affected Component", "Affected Components", "Affected component(s)"],
        )
        component_paths = extract_component_paths(body)
        component_hint = first_non_empty(
            [
                ", ".join(component_paths[:2]),
                shorten(affected, 150),
                infer_component_hint(issue["title"] + " " + body),
            ]
        )

        steps = section_text(sections, ["Steps to reproduce", "Steps"])
        expected = section_text(sections, ["Expected behavior", "Expected Behavior"])
        describe = section_text(
            sections,
            ["Describe the bug", "Bug Description", "Description", "Current Behavior"],
        )
        steps_snippet = shorten(extract_steps_snippet(steps, issue["title"]), 260)
        focus_text = " ".join([issue["title"], describe, expected, steps])
        assertion = infer_assertion(focus_text)
        mocks = infer_mocks(" ".join([issue["title"], describe, expected]), component_hint)
        needs_e2e = infer_needs_e2e(focus_text)

        primary_test = (
            "Component View Test + E2E smoke (integration-sensitive)"
            if needs_e2e
            else "Component View Test"
        )
        e2e_fallback = (
            "Cover full device flow with real integration boundary (permissions/scanner/deeplink/network), and verify final user-visible state."
            if needs_e2e
            else "Optional: run one E2E regression on the same path to confirm controller + navigation wiring."
        )

        metadata_gaps = []
        if not teams:
            metadata_gaps.append("Missing team label")
        if not sevs:
            metadata_gaps.append("Missing severity label")

        row = {
            "issue_number": issue["number"],
            "issue_url": issue["url"],
            "created_at": issue["createdAt"],
            "state": issue["state"],
            "title": clean_title(issue["title"]),
            "team_labels": ", ".join(teams) if teams else "Unlabeled",
            "severity_labels": ", ".join(sevs) if sevs else "Unlabeled",
            "severity_top": sev_top,
            "severity_priority": sev_priority,
            "problem_summary": summary,
            "component_candidate": component_hint,
            "cvt_preconditions_mocks": shorten(mocks, 320),
            "cvt_steps": steps_snippet,
            "cvt_assertions": shorten(assertion, 220),
            "primary_test_type": primary_test,
            "e2e_fallback": shorten(e2e_fallback, 240),
            "metadata_gaps": ", ".join(metadata_gaps) if metadata_gaps else "",
        }
        rows.append(row)

    rows.sort(
        key=lambda item: (
            item["severity_priority"],
            item["created_at"],
        ),
        reverse=False,
    )
    # Keep newest first inside same severity.
    grouped = {}
    for row in rows:
        grouped.setdefault(row["severity_priority"], []).append(row)
    ordered_rows: list[dict] = []
    for priority in sorted(grouped.keys()):
        ordered_rows.extend(sorted(grouped[priority], key=lambda x: x["created_at"], reverse=True))
    return ordered_rows


def write_markdown(rows: list[dict], generated_at: dt.datetime) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    sev_counter = Counter(row["severity_top"] for row in rows)
    team_counter = Counter()
    for row in rows:
        for team in [t.strip() for t in row["team_labels"].split(",") if t.strip() and t.strip() != "Unlabeled"]:
            team_counter[team] += 1

    header = [
        "# MetaMask Mobile bug-to-test matrix (last 30 days)",
        "",
        f"- Generated at (UTC): {generated_at.isoformat(timespec='seconds')}",
        f"- Scope: `{REPO}` issues",
        f"- Filters: `label:type-bug`, `createdAt >= now-30d`",
        f"- Total bugs in scope: **{len(rows)}**",
        "",
        "## Severity distribution",
        "",
        "| Severity | Count |",
        "|---|---:|",
    ]
    for severity, count in sev_counter.most_common():
        header.append(f"| {severity} | {count} |")
    header.extend(
        [
            "",
            "## Top team labels in scoped bugs",
            "",
            "| Team label | Count |",
            "|---|---:|",
        ]
    )
    for team, count in team_counter.most_common(15):
        header.append(f"| {team} | {count} |")

    table_headers = [
        "Issue",
        "Created (UTC)",
        "State",
        "Team labels",
        "Severity labels",
        "Problem summary",
        "Primary test type",
        "Component candidate",
        "CVT preconditions/mocks",
        "CVT steps",
        "CVT assertions",
        "E2E fallback",
        "Metadata gaps",
    ]
    table = [
        "",
        "## Bug-by-bug test blueprint",
        "",
        "|" + "|".join(table_headers) + "|",
        "|" + "|".join(["---"] * len(table_headers)) + "|",
    ]

    for row in rows:
        issue_cell = f"[#{row['issue_number']}]({row['issue_url']})"
        values = [
            issue_cell,
            row["created_at"],
            row["state"],
            row["team_labels"],
            row["severity_labels"],
            row["problem_summary"],
            row["primary_test_type"],
            row["component_candidate"],
            row["cvt_preconditions_mocks"],
            row["cvt_steps"],
            row["cvt_assertions"],
            row["e2e_fallback"],
            row["metadata_gaps"],
        ]
        escaped = [markdown_escape(str(v)) for v in values]
        table.append("|" + "|".join(escaped) + "|")

    MD_PATH.write_text("\n".join(header + table) + "\n")


def write_excel(rows: list[dict], generated_at: dt.datetime) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    wb = Workbook()
    ws = wb.active
    ws.title = "Bug Matrix"

    headers = [
        "Issue #",
        "Issue URL",
        "Created (UTC)",
        "State",
        "Team labels",
        "Severity labels",
        "Problem summary",
        "Primary test type",
        "Component candidate",
        "CVT preconditions/mocks",
        "CVT steps",
        "CVT assertions",
        "E2E fallback",
        "Metadata gaps",
    ]
    ws.append(headers)

    for row in rows:
        ws.append(
            [
                row["issue_number"],
                row["issue_url"],
                row["created_at"],
                row["state"],
                row["team_labels"],
                row["severity_labels"],
                row["problem_summary"],
                row["primary_test_type"],
                row["component_candidate"],
                row["cvt_preconditions_mocks"],
                row["cvt_steps"],
                row["cvt_assertions"],
                row["e2e_fallback"],
                row["metadata_gaps"],
            ]
        )

    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(vertical="top", wrap_text=True)

    # Wrap text on all data cells and set practical widths.
    for row_cells in ws.iter_rows(min_row=2):
        for cell in row_cells:
            cell.alignment = Alignment(vertical="top", wrap_text=True)

    widths = {
        "A": 10,
        "B": 36,
        "C": 22,
        "D": 10,
        "E": 28,
        "F": 20,
        "G": 52,
        "H": 38,
        "I": 38,
        "J": 56,
        "K": 42,
        "L": 44,
        "M": 46,
        "N": 24,
    }
    for col, width in widths.items():
        ws.column_dimensions[col].width = width

    ws.freeze_panes = "A2"

    # Summary sheet.
    sev_counter = Counter(row["severity_top"] for row in rows)
    team_counter = Counter()
    for row in rows:
        for team in [t.strip() for t in row["team_labels"].split(",") if t.strip() and t.strip() != "Unlabeled"]:
            team_counter[team] += 1

    summary = wb.create_sheet("Summary")
    summary.append(["Generated at (UTC)", generated_at.isoformat(timespec="seconds")])
    summary.append(["Repository", REPO])
    summary.append(["Lookback days", LOOKBACK_DAYS])
    summary.append(["Total bugs", len(rows)])
    summary.append([])
    summary.append(["Severity", "Count"])
    for severity, count in sev_counter.most_common():
        summary.append([severity, count])
    summary.append([])
    summary.append(["Team label", "Count"])
    for team, count in team_counter.most_common(20):
        summary.append([team, count])

    for cell in summary[6]:
        cell.fill = header_fill
        cell.font = header_font
    first_team_header_row = 6 + len(sev_counter) + 2
    for cell in summary[first_team_header_row]:
        cell.fill = header_fill
        cell.font = header_font

    summary.column_dimensions["A"].width = 28
    summary.column_dimensions["B"].width = 20

    wb.save(XLSX_PATH)


def main() -> None:
    generated_at = dt.datetime.now(dt.timezone.utc)
    issues = run_gh_issue_list()
    rows = build_rows(issues)
    write_markdown(rows, generated_at)
    write_excel(rows, generated_at)

    print(f"Generated rows: {len(rows)}")
    print(f"Markdown: {MD_PATH}")
    print(f"Excel: {XLSX_PATH}")


if __name__ == "__main__":
    main()
