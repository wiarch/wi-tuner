# Contributing to WI Tuner

Thank you for helping improve WI Tuner.

## Before contributing

- Read `README.md`, `CLAUDE.md` and the relevant documents in `docs/`.
- Keep the product focused on instrument tuning and complementary practice tools.
- Check existing issues and code before starting a duplicate implementation.

## Development setup

Requirements:
- PHP 8.3+
- Composer
- Node.js and npm
- A modern browser for microphone testing

```bash
composer install
cp .env.example .env
php artisan key:generate
npm install
npm run dev
```

Configure a local database and run migrations before using database-backed features.

## Contribution guidelines

- Prefer small, focused pull requests.
- Explain the user problem and expected behavior.
- Include tests for pitch math, presets and server-side logic.
- Test microphone permission denial and start/stop cleanup when touching audio code.
- Preserve accessibility and responsive behavior.
- Do not add audio recording or transmission without an explicit product and privacy review.
- Do not remove legacy modules without a dedicated migration plan.
- Update documentation when behavior, supported instruments or browser requirements change.

## Validation

Run the relevant checks before opening a pull request:

```bash
php artisan test
vendor/bin/pint --test
npm run build
```

If a command cannot be run, state that clearly in the pull request.

## Pull requests

A good pull request includes:
- A concise description of the change.
- Screenshots or a short recording for UI changes (avoid capturing private audio).
- Tests and validation results.
- Known limitations and follow-up work.
