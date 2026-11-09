# CLAUDE.md — WI Tuner

## Product identity

WI Tuner is a browser-first digital instrument tuner. Its primary job is helping musicians tune instruments accurately and quickly, beginning with guitar and bass. It is not primarily a worship-planning, song-catalog or team-management product.

Read these files before making substantial changes:
- `README.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`

## Current stack

- PHP 8.3+
- Laravel 13
- Blade templates
- JavaScript modules
- Web Audio API / MediaDevices API
- Vite
- Tailwind CSS

Do not introduce a frontend framework or major dependency without a clear architectural reason and an explicit plan.

## Existing implementation

- `resources/views/tools/tuner.blade.php`: tuner interface.
- `resources/js/musician-tools.js`: tuner UI integration, reference tones, metronome and circle-of-fifths logic.
- `resources/js/music/pitch-detection.js`: YIN-style fundamental-frequency estimator.
- `resources/js/music/tuning.js`: note/frequency calculations and standard/Drop D instrument presets.
- `tests/js/tuning.test.js`: unit tests for note math, frequency conversion and tuning presets.
- `resources/views/tools/metronome.blade.php`: metronome interface.
- `routes/web.php`: current routes, including the tuner and metronome.
- Existing song, chord, contact and service-plan modules are legacy scope. Do not delete or rewrite them as part of unrelated tuner work.

The current tuner is a useful starting point, not a finished professional-grade pitch engine. Validate algorithms with known reference signals and real instruments before claiming precision.

## Engineering rules

1. Inspect the relevant files, routes, models, migrations and tests before changing behavior.
2. Preserve existing working functionality unless the task explicitly authorizes a migration or removal.
3. Keep pitch detection and note/frequency calculations testable and separated from DOM manipulation as the codebase evolves.
4. Keep pitch detection and music calculations in `resources/js/music/`; do not move them back into `musician-tools.js`.
5. Use semantic HTML, keyboard-accessible controls, responsive layouts and clear permission/error states.
6. Handle missing browser APIs, denied microphone permission, unavailable devices and interrupted audio contexts gracefully.
7. Always stop microphone tracks, animation frames, timers and audio resources when the tuner stops or is disposed.
8. Do not record or transmit microphone audio. Audio analysis should remain local unless a future feature explicitly requires otherwise and receives privacy review.
9. Never hardcode secrets or commit real environment files, tokens, credentials or private keys.
10. Add tests for note conversion, tuning calculations, preset definitions and any new server-side behavior.
11. Do not claim a feature is implemented because it appears in the roadmap.
12. Run relevant tests, static checks and production builds when possible; report exactly what was and was not run.

## Audio and tuning requirements

- Treat frequency detection, note identification, cents deviation and target tuning as separate concepts.
- Make the reference pitch (A4) explicit and configurable when the feature is introduced.
- Represent instrument tunings as data: instrument, tuning name, string order, note names and target frequencies.
- Support standard guitar and bass presets first; add alternative tunings through validated preset data.
- Avoid assuming that every instrument uses six strings or guitar-specific labels.
- Do not display an in-tune state until the detected pitch is stable enough and within the documented tolerance.
- Use smoothing/hysteresis to prevent flickering between states, without hiding genuine pitch changes.
- Keep the user informed when background noise, weak input or multiple simultaneous notes prevent reliable detection.

## Workflow

For each task:
1. Summarize the existing behavior and relevant constraints.
2. Propose a minimal implementation plan.
3. Implement the change with focused tests.
4. Check accessibility, responsive behavior and cleanup of browser resources.
5. Run available validation commands.
6. Summarize changed files, tests, limitations and follow-up work.

## Commands

- `composer install`
- `npm install`
- `npm run dev`
- `npm run build`
- `php artisan test`
- `vendor/bin/pint --test`

Follow the repository's actual scripts and dependency versions; do not assume a command succeeds without running it.
