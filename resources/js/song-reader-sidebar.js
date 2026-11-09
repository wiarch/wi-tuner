/**
 * Sidebar de lectura — visualizador SVG, metrónomo, círculo de quintas.
 */

import { DICTIONARY_GUITAR_LAYOUT, paintGuitarSvg as renderGuitarDiagram } from './lib/chord-diagram-render.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CIRCLE_KEYS = [
    { major: 'Do', majorEn: 'C', minor: 'Lam', minorEn: 'Am' },
    { major: 'Sol', majorEn: 'G', minor: 'Mim', minorEn: 'Em' },
    { major: 'Re', majorEn: 'D', minor: 'Sim', minorEn: 'Bm' },
    { major: 'La', majorEn: 'A', minor: 'Fa♯m', minorEn: 'F#m' },
    { major: 'Mi', majorEn: 'E', minor: 'Do♯m', minorEn: 'C#m' },
    { major: 'Si', majorEn: 'B', minor: 'Sol♯m', minorEn: 'G#m' },
    { major: 'Fa♯', majorEn: 'F#', minor: 'Re♯m', minorEn: 'D#m' },
    { major: 'Re♭', majorEn: 'Db', minor: 'Sibm', minorEn: 'Bbm' },
    { major: 'La♭', majorEn: 'Ab', minor: 'Fam', minorEn: 'Fm' },
    { major: 'Mi♭', majorEn: 'Eb', minor: 'Dom', minorEn: 'Cm' },
    { major: 'Si♭', majorEn: 'Bb', minor: 'Solm', minorEn: 'Gm' },
    { major: 'Fa', majorEn: 'F', minor: 'Rem', minorEn: 'Dm' },
];

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const TRIAD_QUALITIES = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
const DEGREE_LABELS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const HIGHLIGHT_DEGREES = new Set([0, 1, 2, 3, 4, 5]);

const PIANO_START = 60;
const PIANO_SEMITONES = 18;

function noteIndex(name) {
    const sharp = NOTE_NAMES.indexOf(name);
    if (sharp !== -1) {
        return sharp;
    }
    const flatMap = { Db: 1, Eb: 3, Gb: 6, Ab: 8, Bb: 10 };
    return flatMap[name] ?? -1;
}

function normalizeNoteName(note) {
    const match = String(note).trim().match(/^([A-Ga-g])([#b♯♭]?)(\d)?$/);
    if (!match) {
        return null;
    }
    let acc = match[2] || '';
    acc = acc.replace('♯', '#').replace('♭', 'b');
    const letter = match[1].toUpperCase();
    const name = letter + acc;
    const flatMap = { DB: 'Db', EB: 'Eb', GB: 'Gb', AB: 'Ab', BB: 'Bb', CB: 'B', FB: 'E' };
    return flatMap[name] ?? name;
}

function noteToMidi(note, defaultOctave = 4) {
    const normalized = normalizeNoteName(note);
    if (!normalized) {
        return null;
    }
    const match = normalized.match(/^([A-G])([#b]?)$/);
    if (!match) {
        return null;
    }
    const idx = noteIndex(match[1] + (match[2] || ''));
    if (idx < 0) {
        return null;
    }
    const octaveMatch = String(note).match(/(\d)$/);
    const octave = octaveMatch ? Number(octaveMatch[1]) : defaultOctave;
    return (octave + 1) * 12 + idx;
}

function pitchClassFromNote(note) {
    const midi = noteToMidi(note);
    return midi === null ? null : ((midi % 12) + 12) % 12;
}

function lookupCandidates(chordName) {
    const name = String(chordName).trim();
    const candidates = [name];
    const suffixes = ['maj9', 'm9', 'maj7', 'm7', 'add9', 'sus4', 'sus2', 'dim', 'aug', 'maj', '7', 'm'];
    let current = name;

    for (const suffix of suffixes) {
        const re = new RegExp(`${suffix}$`, 'i');
        if (re.test(current)) {
            current = current.replace(re, '');
            if (current && !candidates.includes(current)) {
                candidates.push(current);
            }
        }
    }

    if (/m7$/i.test(name) && !candidates.includes(name.replace(/7$/i, ''))) {
        candidates.push(name.replace(/7$/i, ''));
    }

    return [...new Set(candidates)];
}

function inferChordTones(chordName) {
    const match = String(chordName).trim().match(/^([A-G][#b♯♭]?)(.*)$/i);
    if (!match) {
        return [];
    }

    const root = normalizeNoteName(match[1]);
    const rootIdx = noteIndex(root);
    if (rootIdx < 0) {
        return [];
    }

    const suffix = (match[2] || '').toLowerCase();
    let intervals = [0, 4, 7];

    if (suffix.includes('dim')) {
        intervals = [0, 3, 6];
    } else if (suffix.includes('m') && !suffix.includes('maj')) {
        intervals = [0, 3, 7];
    }

    if (suffix.includes('maj7')) {
        intervals = [...new Set([...intervals, 11])];
    } else if (suffix.includes('m7') || (suffix.includes('7') && !suffix.includes('maj7'))) {
        intervals = [...new Set([...intervals, 10])];
    }

    return intervals.map((i) => NOTE_NAMES[(rootIdx + i) % 12]);
}

function paintGuitarSvg(svgEl, representation) {
    renderGuitarDiagram(svgEl, representation, DICTIONARY_GUITAR_LAYOUT);
}

function isBlackKey(semitone) {
    return [1, 3, 6, 8, 10].includes(semitone % 12);
}

function paintKeyboardSvg(svgEl, notes) {
    const ns = 'http://www.w3.org/2000/svg';
    const activeClasses = new Set(
        (notes || []).map((n) => pitchClassFromNote(n)).filter((pc) => pc !== null)
    );

    const whiteW = 22;
    const whiteH = 72;
    const blackW = 14;
    const blackH = 44;
    let x = 8;
    const whitePositions = [];

    svgEl.innerHTML = '';

    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', '320');
    bg.setAttribute('height', '100');
    bg.setAttribute('fill', '#0a0f1a');
    bg.setAttribute('rx', '8');
    svgEl.appendChild(bg);

    for (let i = 0; i < PIANO_SEMITONES; i++) {
        const midi = PIANO_START + i;
        const pc = midi % 12;
        if (!isBlackKey(i)) {
            const active = activeClasses.has(pc);
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', String(x));
            rect.setAttribute('y', '16');
            rect.setAttribute('width', String(whiteW));
            rect.setAttribute('height', String(whiteH));
            rect.setAttribute('rx', '2');
            rect.setAttribute('fill', active ? '#8b5cf6' : '#334155');
            rect.setAttribute('stroke', active ? '#c4b5fd' : 'rgba(255,255,255,0.1)');
            rect.setAttribute('stroke-width', '1');
            if (active) {
                rect.setAttribute('data-active-note', NOTE_NAMES[pc]);
            }
            svgEl.appendChild(rect);
            whitePositions.push({ midi, x, pc });
            x += whiteW;
        }
    }

    let whiteIdx = 0;
    for (let i = 0; i < PIANO_SEMITONES; i++) {
        if (isBlackKey(i)) {
            const midi = PIANO_START + i;
            const pc = midi % 12;
            const active = activeClasses.has(pc);
            const prevWhite = whitePositions[whiteIdx - 1];
            if (prevWhite) {
                const bx = prevWhite.x + whiteW - blackW / 2;
                const rect = document.createElementNS(ns, 'rect');
                rect.setAttribute('x', String(bx));
                rect.setAttribute('y', '16');
                rect.setAttribute('width', String(blackW));
                rect.setAttribute('height', String(blackH));
                rect.setAttribute('rx', '2');
                rect.setAttribute('fill', active ? '#6d28d9' : '#1e293b');
                rect.setAttribute('stroke', 'rgba(0,0,0,0.3)');
                if (active) {
                    rect.setAttribute('data-active-note', NOTE_NAMES[pc]);
                }
                svgEl.appendChild(rect);
            }
        } else {
            whiteIdx++;
        }
    }
}

function createChordDiagramVisualizer(root, embeddedLibrary, diagramsUrl) {
    const titleEl = root.querySelector('[data-chord-viz-title]');
    const hintEl = root.querySelector('[data-chord-viz-hint]');
    const guitarWrap = root.querySelector('[data-chord-viz-guitar]');
    const keyboardWrap = root.querySelector('[data-chord-viz-keyboard]');
    const guitarSvg = root.querySelector('[data-guitar-svg]');
    const keyboardSvg = root.querySelector('[data-keyboard-svg]');
    const vizTabs = root.querySelectorAll('[data-chord-viz-tab]');
    const pickers = root.querySelectorAll('[data-chord-pick]');

    const cache = new Map();
    let instrument = 'guitar';
    let currentChord = null;
    let loading = false;

    Object.entries(embeddedLibrary || {}).forEach(([name, entry]) => {
        cache.set(name, { name, ...entry, source: 'embedded' });
    });

    function setInstrument(mode) {
        instrument = mode;
        vizTabs.forEach((t) => {
            const active = t.dataset.chordVizTab === mode;
            t.className = `chord-viz-tab flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${active ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`;
        });
        guitarWrap.classList.toggle('hidden', mode !== 'guitar');
        keyboardWrap.classList.toggle('hidden', mode !== 'keyboard');
    }

    vizTabs.forEach((t) => {
        t.addEventListener('click', () => setInstrument(t.dataset.chordVizTab));
    });

    async function fetchFromDatabase(chordName) {
        const url = new URL(diagramsUrl, window.location.origin);
        url.searchParams.set('name', chordName);
        const response = await fetch(url.toString(), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        cache.set(data.name, { ...data, source: 'api' });
        return data;
    }

    async function resolveDiagrams(chordName) {
        for (const candidate of lookupCandidates(chordName)) {
            if (cache.has(candidate)) {
                return { requested: chordName, match: cache.get(candidate), matchName: candidate };
            }
        }

        for (const candidate of lookupCandidates(chordName)) {
            const data = await fetchFromDatabase(candidate);
            if (data) {
                return { requested: chordName, match: data, matchName: candidate };
            }
        }

        return {
            requested: chordName,
            match: null,
            matchName: null,
            inferredKeyboard: inferChordTones(chordName),
        };
    }

    function updatePickerUI(chordName) {
        pickers.forEach((btn) => {
            const active = btn.dataset.chordPick === chordName;
            btn.classList.toggle('border-violet-500/50', active);
            btn.classList.toggle('bg-violet-600/25', active);
            btn.classList.toggle('ring-1', active);
            btn.classList.toggle('ring-violet-500/40', active);
        });

        document.querySelectorAll('.chord-trigger').forEach((trigger) => {
            const active = trigger.dataset.chord === chordName;
            trigger.classList.toggle('bg-violet-500/25', active);
            trigger.classList.toggle('text-violet-200', active);
            trigger.classList.toggle('ring-1', active);
            trigger.classList.toggle('ring-violet-400/50', active);
        });
    }

    function paintEmpty() {
        titleEl.textContent = '—';
        hintEl.textContent = 'Haz clic en un acorde de la letra';
        paintGuitarSvg(guitarSvg, [-1, -1, -1, -1, -1, -1]);
        paintKeyboardSvg(keyboardSvg, []);
        updatePickerUI(null);
    }

    async function selectChord(chordName) {
        if (!chordName || loading) {
            return;
        }

        currentChord = chordName;
        loading = true;
        titleEl.textContent = chordName;
        hintEl.textContent = 'Consultando diccionario…';
        updatePickerUI(chordName);

        const resolved = await resolveDiagrams(chordName);
        loading = false;

        const entry = resolved.match;
        const guitarRep = entry?.guitar?.[0]?.representation ?? null;
        let keyboardNotes = entry?.keyboard?.[0]?.representation ?? null;

        if (!keyboardNotes?.length && resolved.inferredKeyboard?.length) {
            keyboardNotes = resolved.inferredKeyboard;
        }

        if (!guitarRep && !keyboardNotes?.length) {
            hintEl.textContent = 'Sin diagrama en el diccionario';
            paintGuitarSvg(guitarSvg, [-1, -1, -1, -1, -1, -1]);
            paintKeyboardSvg(keyboardSvg, []);
            return;
        }

        if (resolved.matchName && resolved.matchName !== chordName) {
            hintEl.textContent = `Diagrama de ${resolved.matchName} (aprox. para ${chordName})`;
        } else if (entry?.source === 'api') {
            hintEl.textContent = 'Diagrama cargado del diccionario';
        } else {
            hintEl.textContent = keyboardNotes === resolved.inferredKeyboard
                ? 'Teclas inferidas · guitarra no disponible'
                : 'Diagrama del diccionario';
        }

        paintGuitarSvg(guitarSvg, guitarRep ?? [-1, -1, -1, -1, -1, -1]);
        paintKeyboardSvg(keyboardSvg, keyboardNotes ?? []);

        if (keyboardNotes?.length) {
            hintEl.textContent += ` · ${keyboardNotes.join(', ')}`;
        }
    }

    pickers.forEach((btn) => {
        btn.addEventListener('click', () => selectChord(btn.dataset.chordPick));
    });

    document.addEventListener('wituner:chord-select', (e) => {
        if (e.detail?.chord) {
            selectChord(e.detail.chord);
        }
    });

    paintEmpty();
    setInstrument('guitar');

    return { selectChord, setInstrument };
}

function initChordDictionaryPage() {
    const root = document.querySelector('[data-chord-dictionary-page]');
    if (!root) {
        return;
    }

    const library = JSON.parse(root.dataset.diagramLibrary || '{}');
    const diagramsUrl = root.dataset.diagramsUrl || '/chords/diagrams';
    const instrument = root.dataset.instrument || 'guitar';
    const { selectChord, setInstrument } = createChordDiagramVisualizer(root, library, diagramsUrl);

    setInstrument(instrument);

    const firstPick = root.querySelector('[data-chord-pick]');
    if (firstPick) {
        selectChord(firstPick.dataset.chordPick);
    }
}

function initCirclePage() {
    const root = document.querySelector('[data-circle-page]');
    if (!root) {
        return;
    }

    initCircle(root);
}

function getScaleChords(rootEn) {
    const rootIdx = noteIndex(rootEn);
    if (rootIdx < 0) {
        return [];
    }
    return MAJOR_SCALE.map((interval, i) => {
        const note = NOTE_NAMES[(rootIdx + interval) % 12];
        let chord = note;
        if (TRIAD_QUALITIES[i] === 'minor') {
            chord += 'm';
        } else if (TRIAD_QUALITIES[i] === 'diminished') {
            chord += 'dim';
        }
        return { degree: DEGREE_LABELS[i], chord, highlight: HIGHLIGHT_DEGREES.has(i) };
    });
}

function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, rInner, rOuter, startAngle, endAngle) {
    const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
    const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
    const startInner = polarToCartesian(cx, cy, rInner, startAngle);
    const endInner = polarToCartesian(cx, cy, rInner, endAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return [
        `M ${startOuter.x} ${startOuter.y}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
        `L ${startInner.x} ${startInner.y}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
        'Z',
    ].join(' ');
}

function initSidebarTabs(root) {
    const tabs = root.querySelectorAll('[data-sidebar-tab]');
    const panels = root.querySelectorAll('[data-sidebar-panel]');

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const name = tab.dataset.sidebarTab;
            tabs.forEach((t) => {
                const active = t === tab;
                t.classList.toggle('border-violet-500', active);
                t.classList.toggle('text-violet-200', active);
                t.classList.toggle('border-transparent', !active);
                t.classList.toggle('text-slate-400', !active);
                t.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            panels.forEach((p) => {
                p.classList.toggle('hidden', p.dataset.sidebarPanel !== name);
            });
        });
    });
}

function initMetronome(root) {
    const bpmInput = root.querySelector('[data-sidebar-bpm]');
    const bpmDisplay = root.querySelector('[data-sidebar-bpm-display]');
    const beatsEl = root.querySelector('[data-sidebar-beats]');
    const toggleBtn = root.querySelector('[data-sidebar-metro-toggle]');

    let audioCtx = null;
    let isPlaying = false;
    let bpm = 120;
    let currentBeat = 0;
    let nextNoteTime = 0;
    let timer = null;
    const beatsPerBar = 4;

    function getCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function renderBeats() {
        beatsEl.innerHTML = '';
        for (let i = 0; i < beatsPerBar; i++) {
            const dot = document.createElement('span');
            dot.dataset.beatDot = String(i);
            dot.className = `h-2.5 w-2.5 rounded-full border border-white/20 ${i === 0 ? 'bg-violet-600/30' : 'bg-white/5'}`;
            beatsEl.appendChild(dot);
        }
    }

    function flashBeat(beat) {
        beatsEl.querySelectorAll('[data-beat-dot]').forEach((dot, i) => {
            const active = i === beat;
            const accent = i === 0;
            dot.className = active
                ? `h-2.5 w-2.5 rounded-full border ${accent ? 'border-violet-400 bg-violet-500' : 'border-white/40 bg-white/30'}`
                : `h-2.5 w-2.5 rounded-full border border-white/20 ${i === 0 ? 'bg-violet-600/30' : 'bg-white/5'}`;
        });
    }

    function playClick(time, accent) {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = accent ? 1200 : 800;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(accent ? 0.45 : 0.28, time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.06);
    }

    function schedule() {
        const ctx = getCtx();
        const spb = 60 / bpm;
        while (nextNoteTime < ctx.currentTime + 0.12) {
            const accent = currentBeat === 0;
            playClick(nextNoteTime, accent);
            const beat = currentBeat;
            setTimeout(() => flashBeat(beat), Math.max(0, (nextNoteTime - ctx.currentTime) * 1000));
            nextNoteTime += spb;
            currentBeat = (currentBeat + 1) % beatsPerBar;
        }
    }

    toggleBtn?.addEventListener('click', () => {
        if (isPlaying) {
            isPlaying = false;
            clearInterval(timer);
            toggleBtn.textContent = '▶ Iniciar';
            toggleBtn.className = 'mt-4 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500';
            renderBeats();
            return;
        }
        const ctx = getCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        isPlaying = true;
        currentBeat = 0;
        nextNoteTime = ctx.currentTime + 0.05;
        toggleBtn.textContent = '■ Detener';
        toggleBtn.className = 'mt-4 w-full rounded-xl bg-rose-600/80 py-2.5 text-sm font-medium text-white hover:bg-rose-500/80';
        timer = setInterval(schedule, 25);
    });

    bpmInput?.addEventListener('input', () => {
        bpm = Number(bpmInput.value);
        bpmDisplay.textContent = String(bpm);
    });

    renderBeats();
}

function initCircle(root) {
    const svg = root.querySelector('[data-sidebar-circle-svg]');
    const selectedEl = root.querySelector('[data-sidebar-circle-selected]');
    const chordsEl = root.querySelector('[data-sidebar-circle-chords]');
    const cx = 160;
    const cy = 160;
    const slice = 30;
    let selectedIndex = null;

    function render() {
        svg.innerHTML = '';
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bg.setAttribute('cx', String(cx));
        bg.setAttribute('cy', String(cy));
        bg.setAttribute('r', '150');
        bg.setAttribute('fill', '#0a0f1a');
        bg.setAttribute('stroke', 'rgba(255,255,255,0.08)');
        svg.appendChild(bg);

        CIRCLE_KEYS.forEach((key, i) => {
            const start = i * slice - slice / 2;
            const end = start + slice;
            const selected = selectedIndex === i;
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.style.cursor = 'pointer';

            const outer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            outer.setAttribute('d', describeArc(cx, cy, 95, 150, start, end));
            outer.setAttribute('fill', selected ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.04)');
            outer.setAttribute('stroke', selected ? 'rgba(167,139,250,0.8)' : 'rgba(255,255,255,0.06)');

            const inner = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            inner.setAttribute('d', describeArc(cx, cy, 55, 94, start, end));
            inner.setAttribute('fill', selected ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.02)');
            inner.setAttribute('stroke', 'rgba(255,255,255,0.05)');

            const angle = start + slice / 2;
            const maj = polarToCartesian(cx, cy, 122, angle);
            const min = polarToCartesian(cx, cy, 74, angle);

            const majT = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            majT.setAttribute('x', String(maj.x));
            majT.setAttribute('y', String(maj.y));
            majT.setAttribute('text-anchor', 'middle');
            majT.setAttribute('dominant-baseline', 'middle');
            majT.setAttribute('fill', selected ? '#e9d5ff' : '#cbd5e1');
            majT.setAttribute('font-size', '12');
            majT.setAttribute('font-weight', '600');
            majT.textContent = key.major;

            const minT = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            minT.setAttribute('x', String(min.x));
            minT.setAttribute('y', String(min.y));
            minT.setAttribute('text-anchor', 'middle');
            minT.setAttribute('dominant-baseline', 'middle');
            minT.setAttribute('fill', selected ? '#c4b5fd' : '#64748b');
            minT.setAttribute('font-size', '9');
            minT.textContent = key.minor;

            g.appendChild(outer);
            g.appendChild(inner);
            g.appendChild(majT);
            g.appendChild(minT);
            g.addEventListener('click', () => {
                selectedIndex = i;
                render();
                const chords = getScaleChords(key.majorEn);
                selectedEl.textContent = `Escala de ${key.major} mayor`;
                chordsEl.innerHTML = chords
                    .map((c) => {
                        const cls = c.highlight
                            ? 'border-violet-500/50 bg-violet-600/25 text-violet-100'
                            : 'border-white/10 bg-white/5 text-slate-500';
                        return `<span class="inline-flex flex-col items-center rounded-lg border px-2 py-1 ${cls}">
                            <span class="font-mono text-xs font-semibold">${c.chord}</span>
                            <span class="text-[9px] opacity-70">${c.degree}</span>
                        </span>`;
                    })
                    .join('');
            });
            svg.appendChild(g);
        });
    }

    render();
}

function initSongReaderSidebar() {
    const root = document.querySelector('[data-song-reader-sidebar]');
    if (!root) {
        return;
    }

    const library = JSON.parse(root.dataset.diagramLibrary || '{}');
    const diagramsUrl = root.dataset.diagramsUrl || '/chords/diagrams';
    initSidebarTabs(root);
    createChordDiagramVisualizer(root, library, diagramsUrl);
    initMetronome(root);
    initCircle(root);
}

document.addEventListener('DOMContentLoaded', () => {
    initSongReaderSidebar();
    initChordDictionaryPage();
    initCirclePage();
});
