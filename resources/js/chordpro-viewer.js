function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderGuitarFretboard(representation, variantName) {
    const frets = Array.isArray(representation) ? representation : [];
    const labels = ['E', 'A', 'D', 'G', 'B', 'e'];
    const numericFrets = frets.map((f) => (f === 'x' || f === 'X' ? -1 : Number(f)));

    let minFret = 0;
    const positive = numericFrets.filter((f) => f > 0);
    if (positive.length && Math.min(...positive) > 1) {
        minFret = Math.min(...positive);
    }

    const cells = numericFrets.map((fret, i) => {
        let symbol = '○';
        let title = 'Al aire';
        if (fret === -1 || Number.isNaN(fret)) {
            symbol = '×';
            title = 'Silenciada';
        } else if (fret > 0) {
            symbol = String(fret - minFret + (minFret > 0 ? 1 : 0));
            if (minFret > 0) {
                symbol = String(fret);
            }
            title = `Traste ${fret}`;
        }
        return `<div class="flex flex-col items-center gap-1" title="${labels[i]}: ${title}">
            <span class="text-[10px] text-slate-500">${labels[i]}</span>
            <span class="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-sm font-mono text-violet-300">${symbol}</span>
        </div>`;
    }).join('');

    const baseFret = minFret > 0 ? `<p class="mb-2 text-xs text-slate-500">Cejilla traste ${minFret}</p>` : '';

    return `<div class="guitar-diagram">
        ${baseFret}
        <div class="grid grid-cols-6 gap-1">${cells}</div>
        ${variantName ? `<p class="mt-2 text-xs text-slate-400">${escapeHtml(variantName)}</p>` : ''}
    </div>`;
}

function noteToMidi(note) {
    const map = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    const match = String(note).trim().match(/^([A-G])([#b]?)(\d)?$/i);
    if (!match) {
        return null;
    }
    const letter = match[1].toUpperCase();
    const acc = match[2] || '';
    const key = letter + acc;
    if (!(key in map)) {
        return null;
    }
    const octave = match[3] ? Number(match[3]) : 4;
    return (octave + 1) * 12 + map[key];
}

function renderKeyboardMap(representation, variantName) {
    const notes = Array.isArray(representation) ? representation : [];
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const whiteMidi = whiteKeys.map((n) => noteToMidi(n + '4')).filter((m) => m !== null);
    const activeMidis = new Set(notes.map((n) => noteToMidi(n)).filter((m) => m !== null));

    const keys = whiteKeys.map((name, index) => {
        const midi = whiteMidi[index];
        const active = activeMidis.has(midi);
        const cls = active
            ? 'bg-violet-500 text-white border-violet-400'
            : 'bg-slate-700 text-slate-400 border-white/10';
        return `<div class="flex h-16 w-8 items-end justify-center rounded-b-md border pb-1 text-[10px] font-mono ${cls}">${name}</div>`;
    }).join('');

    const noteList = notes.map((n) => `<span class="rounded bg-violet-500/20 px-2 py-0.5 font-mono text-xs text-violet-300">${escapeHtml(n)}</span>`).join(' ');

    return `<div class="keyboard-diagram">
        <div class="flex gap-0.5">${keys}</div>
        <div class="mt-3 flex flex-wrap gap-1">${noteList}</div>
        ${variantName ? `<p class="mt-2 text-xs text-slate-400">${escapeHtml(variantName)}</p>` : ''}
    </div>`;
}

function renderPopoverContent(chordName, viewMode, library) {
    const entry = library[chordName];
    if (!entry) {
        return `<p class="text-sm text-slate-400">Sin diagrama para <span class="font-mono text-violet-300">${escapeHtml(chordName)}</span> en el diccionario.</p>`;
    }

    const diagrams = entry[viewMode] || [];
    if (!diagrams.length) {
        return `<p class="text-sm text-slate-400">No hay diagramas de ${viewMode === 'guitar' ? 'guitarra' : 'teclado'} para <span class="font-mono text-violet-300">${escapeHtml(chordName)}</span>.</p>`;
    }

    return diagrams.map((diagram, index) => {
        const header = diagrams.length > 1
            ? `<p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">${escapeHtml(diagram.variant_name)}</p>`
            : '';
        const body = viewMode === 'guitar'
            ? renderGuitarFretboard(diagram.representation, diagrams.length === 1 ? diagram.variant_name : null)
            : renderKeyboardMap(diagram.representation, diagrams.length === 1 ? diagram.variant_name : null);
        const divider = index < diagrams.length - 1 ? '<hr class="my-3 border-white/10">' : '';
        return `${header}${body}${divider}`;
    }).join('');
}

function selectChord(chord, library) {
    document.dispatchEvent(new CustomEvent('wituner:chord-select', {
        detail: { chord, library },
    }));
}

function initChordProViewer(root) {
    const library = JSON.parse(root.dataset.diagramLibrary || '{}');
    const viewMode = root.dataset.viewMode || 'guitar';
    const hasSidebar = Boolean(document.querySelector('[data-song-reader-sidebar]'));

    let popover = null;
    let activeTrigger = null;
    let hideTimer = null;

    if (!hasSidebar) {
        popover = document.createElement('div');
        popover.id = 'chord-diagram-popover';
        popover.className = 'pointer-events-none fixed z-[100] hidden w-72 rounded-xl border border-white/10 bg-[#141c2e] p-4 shadow-2xl shadow-black/50';
        popover.setAttribute('role', 'tooltip');
        document.body.appendChild(popover);
    }

    function showPopover(trigger) {
        if (!popover) {
            return;
        }
        clearTimeout(hideTimer);
        activeTrigger = trigger;
        const chord = trigger.dataset.chord;
        popover.innerHTML = `<p class="mb-2 font-mono text-sm font-semibold text-white">${escapeHtml(chord)}</p>${renderPopoverContent(chord, viewMode, library)}`;
        popover.classList.remove('hidden');

        const rect = trigger.getBoundingClientRect();
        const popRect = popover.getBoundingClientRect();
        let top = rect.top - popRect.height - 8;
        let left = rect.left + rect.width / 2 - popRect.width / 2;

        if (top < 8) {
            top = rect.bottom + 8;
        }
        left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));

        popover.style.top = `${top + window.scrollY}px`;
        popover.style.left = `${left + window.scrollX}px`;
    }

    function scheduleHide() {
        if (!popover) {
            return;
        }
        hideTimer = setTimeout(() => {
            popover.classList.add('hidden');
            activeTrigger = null;
        }, 150);
    }

    root.querySelectorAll('.chord-trigger').forEach((trigger) => {
        const chord = trigger.dataset.chord;

        trigger.addEventListener('mouseenter', () => {
            selectChord(chord, library);
            showPopover(trigger);
        });
        trigger.addEventListener('mouseleave', scheduleHide);
        trigger.addEventListener('focus', () => {
            selectChord(chord, library);
            showPopover(trigger);
        });
        trigger.addEventListener('blur', scheduleHide);
        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            selectChord(chord, library);
            if (!popover) {
                return;
            }
            if (activeTrigger === trigger && !popover.classList.contains('hidden')) {
                popover.classList.add('hidden');
                activeTrigger = null;
            } else {
                showPopover(trigger);
            }
        });
    });

    if (popover) {
        popover.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        popover.addEventListener('mouseleave', scheduleHide);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-chordpro-viewer]').forEach(initChordProViewer);
});
