# Personal car share implementation plan

**Goal:** Deliver the approved personal sharing card and wider precise inputs, then verify, commit and push.

**Architecture:** Keep the existing static calculator. Add a dependency-free module for pure identity/input rules and browser preview, plus scoped styles. Existing calculations and URL units stay stable.

**Tech Stack:** Vanilla JavaScript, Canvas, HTML dialog, Node test runner.

- [x] Add behavioral tests for identity boundaries, piecewise mapping, precise values and invalid inputs; observe failure.
- [x] Implement `personal-car-share.js` and `personal-car-share.css`; integrate numeric inputs and existing read/reset/link boundaries in `index.html`.
- [x] Build accessible preview with selectable identity, editable declaration and optional mood; render and download the personal PNG.
- [x] Update obsolete card contracts and run all repository tests plus encoding checks.
- [x] Verify desktop/mobile browser behavior, large values, URL round trips, zero mileage and PNG export. Review screenshots.
- [x] Record results, commit only task files and push to origin.

## Verification results (2026-10-20)

- 17 Node test suites pass, including identity thresholds, segmented values, input precision, share links and card integration.
- The full 20-suite run retains 3 baseline failures: button-labels and desktop-share assert obsolete/conflicting button copy; visit-counter expects the former Redis REST URL rather than the current command POST. Each was independently reproduced using HEAD versions before this implementation; those unrelated tests and behavior were left unchanged.
- Playwright passes on 1440px desktop and 390px mobile: precise typing, 380万元/120000km URL round-trip, identity selection, personal copy, real PNG download (1080×1920), closing/focus, invalid inputs, reset, zero mileage/zero costs, long copy and legacy links. Additional 320px/max-value/long-copy/Escape checks pass. No browser page errors.
- Changed product files pass encoding guard and JavaScript syntax checks. Screenshot review completed for desktop/mobile and full PNG at maximum allowed values.
- Independent focused code review approved with no important actionable findings.
- User-provided untracked AGENTS.md is excluded from the implementation commit.
