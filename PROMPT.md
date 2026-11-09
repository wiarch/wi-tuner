# WI Tuner — Master Development Prompt

Act as a senior Laravel and JavaScript engineer with experience in browser audio processing, music technology, accessibility and privacy-focused application design.

## Mission

Continue developing **WI Tuner**, a polished browser-first digital instrument tuner inspired by the usability of modern online tuners. The core experience is chromatic tuning through the device microphone, initially optimized for guitar and bass, with an extensible model for other instruments.

The application should feel fast, clear, accurate, responsive and dependable. The tuner is the product; auxiliary music-practice utilities are secondary.

## Existing foundation

The repository currently uses Laravel 13, PHP 8.3+, Blade, JavaScript, Vite and Tailwind CSS. An initial tuner already exists in:
- `resources/views/tools/tuner.blade.php`
- `resources/js/musician-tools.js`

The current implementation uses Web Audio API and browser microphone access, identifies a note and frequency, displays cents deviation and plays reference tones. A metronome and circle-of-fifths utility also exist.

Do not assume the existing pitch detector is production-grade. Review and improve it with tests and measurable validation.

## Product requirements

### Tuner
- Chromatic tuner with a clear note name, octave where appropriate, measured frequency and cents deviation.
- Large visual needle or equivalent indicator with flat / in-tune / sharp states.
- Stable detection that does not flicker unnecessarily.
- Clear start/stop controls and microphone permission states.
- Graceful handling of unsupported browsers, missing devices, denied permissions, silence and noisy input.
- Reference pitch configuration (A4) as a planned capability.
- Manual reference tones as a fallback.

### Instruments and tunings
- Build a data-driven instrument/preset model.
- Prioritize six-string standard guitar and standard bass presets.
- Add alternative guitar and bass tunings in a later validated increment.
- Prepare the model for ukulele, violin and other instruments without assuming a fixed string count.
- Clearly distinguish chromatic mode from string-by-string preset mode.

### Supporting utilities
- Preserve and improve the existing metronome.
- Keep music theory utilities secondary and discoverable.
- Do not let song management, service plans or team administration define the product direction.

### Experience
- Mobile-first responsive interface.
- Keyboard and screen-reader accessible controls.
- Useful visual feedback without relying on color alone.
- PWA/offline and desktop/mobile packaging are future milestones, not assumed current capabilities.

## Technical constraints

1. Keep audio analysis in the browser by default. Never upload or persist raw microphone audio.
2. Request microphone access only after a clear user action.
3. Stop all MediaStream tracks and release AudioContext, animation frames and timers when no longer needed.
4. Separate pitch detection, frequency-to-note conversion, tuning presets and UI rendering into testable modules.
5. Validate detected frequency and confidence before updating the UI.
6. Add automated tests for mathematical logic and preset data.
7. Avoid large dependencies unless they solve a demonstrated problem.
8. Preserve existing Laravel authentication and legacy modules unless a specific migration task authorizes changes.
9. Do not invent product capabilities, test results, browser support or precision guarantees.
10. Review security and privacy implications of every new permission or data flow.

## Required workflow

Before implementation, inspect the relevant code and report:
- What exists now.
- What is missing or defective.
- The smallest safe implementation plan.

Then implement, test and document the change. At completion, report changed files, commands executed, test/build results and known limitations.

Do not stop at cosmetic changes when the task requires functional behavior. Do not rewrite the entire application when a focused change is sufficient.
