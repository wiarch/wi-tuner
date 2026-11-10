@push('head')
    @vite(['resources/js/song-performance.js'])
@endpush

<x-app-layout>
    @if (session('status') === 'song-created')
        <div class="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">Canción registrada.</div>
    @endif
    @if (session('status') === 'song-updated')
        <div class="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">Canción actualizada.</div>
    @endif

    <div
        data-song-performance
        data-song-key="{{ $song->key }}"
        data-diagram-library='@json($diagramLibrary)'
        data-chord-names='@json($songChordNames)'
        class="song-performance -mx-4 overflow-hidden rounded-xl border border-white/5 bg-[#121820] sm:-mx-6 lg:-mx-8"
    >
        <script type="application/json" data-song-content>@json($content)</script>
        <div class="flex min-h-[calc(100vh-7rem)] flex-col lg:flex-row">
            {{-- Barra lateral de herramientas --}}
            <aside class="order-2 flex shrink-0 flex-row flex-wrap gap-1 border-t border-white/5 bg-[#0e131c] p-2 lg:order-1 lg:w-52 lg:flex-col lg:gap-0 lg:border-r lg:border-t-0 lg:p-0">
                <div class="hidden border-b border-white/5 px-3 py-3 lg:block">
                    <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Herramientas</p>
                </div>

                <button type="button" data-autoscroll-btn class="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5 lg:w-full lg:rounded-none">
                    <span class="text-base">↕</span> Desplazar
                </button>
                <button type="button" data-fullscreen-btn class="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5 lg:w-full lg:rounded-none">
                    <span class="text-base">⛶</span> Pantalla completa
                </button>

                <div class="flex w-full items-center gap-2 rounded-lg px-3 py-2 lg:rounded-none lg:border-t lg:border-white/5">
                    <span class="shrink-0 text-xs text-slate-500">Instrum.</span>
                    <select data-instrument class="admin-input flex-1 py-1 text-xs">
                        <option value="guitar">Guitarra</option>
                        <option value="keyboard">Teclado</option>
                    </select>
                </div>

                <div class="flex items-center gap-1 rounded-lg px-3 py-2 lg:w-full lg:rounded-none lg:border-t lg:border-white/5">
                    <span class="mr-1 text-xs text-slate-500">Tono</span>
                    <button type="button" data-transpose-down class="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-slate-300 hover:bg-white/5">−</button>
                    <span data-transpose-value class="min-w-[2rem] text-center font-mono text-xs text-amber-400">0</span>
                    <button type="button" data-transpose-up class="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-slate-300 hover:bg-white/5">+</button>
                </div>

                <div class="hidden px-3 py-2 text-xs text-slate-500 lg:block lg:border-t lg:border-white/5">
                    <span class="text-slate-400">Afinación</span>
                    <p class="mt-0.5 text-slate-300">Estándar</p>
                </div>

                <div class="flex w-full items-center gap-2 rounded-lg px-3 py-2 lg:rounded-none lg:border-t lg:border-white/5">
                    <span class="shrink-0 text-xs text-slate-500">Capo</span>
                    <select data-capo class="admin-input flex-1 py-1 text-xs">
                        <option value="0">Sin capo</option>
                        @for ($i = 1; $i <= 9; $i++)
                            <option value="{{ $i }}">Traste {{ $i }}</option>
                        @endfor
                    </select>
                </div>
                <p data-capo-label class="hidden px-3 pb-2 text-[10px] text-slate-500 lg:block">Sin capo</p>

                <div class="flex w-full flex-col gap-1 rounded-lg px-3 py-2 lg:rounded-none lg:border-t lg:border-white/5">
                    <div class="flex items-center justify-between text-xs text-slate-500">
                        <span>Texto</span>
                        <span data-text-size-value class="font-mono text-amber-400">100%</span>
                    </div>
                    <input type="range" data-text-size min="70" max="150" value="100" class="w-full accent-amber-500">
                </div>

                <label class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 lg:rounded-none lg:border-t lg:border-white/5">
                    <input type="checkbox" data-show-diagrams checked class="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/40">
                    Diagramas
                </label>

                <details class="w-full lg:border-t lg:border-white/5">
                    <summary class="cursor-pointer list-none px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                        ⏱ Metrónomo
                    </summary>
                    <div class="space-y-2 border-t border-white/5 px-3 py-3">
                        <input type="range" data-metro-bpm min="40" max="220" value="100" class="w-full accent-amber-500">
                        <button type="button" data-metro-toggle class="w-full rounded-lg bg-amber-600/80 py-1.5 text-xs font-medium text-white hover:bg-amber-500">▶</button>
                    </div>
                </details>

                <a href="{{ route('songs.export', $song) }}" class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5 lg:w-full lg:rounded-none lg:border-t lg:border-white/5">
                    <span class="text-base">⎙</span> Exportar
                </a>
                <a href="{{ route('songs.edit', $song) }}" class="mt-auto hidden items-center gap-2 border-t border-white/5 px-3 py-3 text-xs text-violet-400 hover:text-violet-300 lg:flex">
                    ✎ Editar cifrado
                </a>
            </aside>

            {{-- Contenido principal --}}
            <div class="order-1 flex min-w-0 flex-1 flex-col lg:order-2">
                <header class="border-b border-white/5 px-4 py-4 sm:px-6">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 class="text-xl font-bold text-white sm:text-2xl">{{ $song->title }}</h1>
                            <p class="mt-0.5 text-sm text-slate-400">{{ $song->artist }}</p>
                        </div>
                        <div class="flex gap-3">
                            <a href="{{ route('songs.export', $song) }}" class="text-xs text-amber-400 hover:text-amber-300">Exportar</a>
                            <a href="{{ route('songs.edit', $song) }}" class="text-xs text-violet-400 hover:text-violet-300">Editar →</a>
                        </div>
                    </div>

                    <nav class="mt-4 flex flex-wrap gap-1" role="tablist">
                        <button type="button" data-view-tab="main" class="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white">Principal</button>
                        <button type="button" data-view-tab="main" class="rounded-md px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200" disabled title="Próximamente">Simplificada</button>
                        <button type="button" data-view-tab="lyrics" class="rounded-md px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200">Letra</button>
                    </nav>
                </header>

                <div data-chord-carousel-wrap class="border-b border-white/5 bg-[#0e131c]/80 px-4 py-3 sm:px-6">
                    <div class="mb-2 flex items-center justify-between">
                        <p class="text-xs font-medium uppercase tracking-wider text-slate-500">Acordes de la canción</p>
                        <p class="text-xs text-slate-500">Tono: <span data-display-key class="font-mono font-semibold text-amber-400">{{ $song->key }}</span></p>
                    </div>
                    @if (count($songChordNames))
                        <div data-chord-carousel class="flex gap-2 overflow-x-auto pb-1"></div>
                    @else
                        <p class="text-xs text-slate-600">Sin acordes en el cifrado.</p>
                    @endif
                </div>

                <div data-chord-sheet class="flex-1 overflow-auto bg-[#0a0e14] px-4 py-6 sm:px-8 sm:py-8">
                    @if ($content === '')
                        <p class="py-16 text-center text-sm text-slate-500">
                            Sin letra ni cifrado.
                            <a href="{{ route('songs.edit', $song) }}" class="text-violet-400 hover:underline">Agregar</a>
                        </p>
                    @endif
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
