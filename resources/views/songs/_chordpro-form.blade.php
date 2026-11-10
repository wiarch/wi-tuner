@php
    $song = $song ?? null;
    $chordProContent = old(
        'content',
        $song?->chords?->firstWhere('instrument', 'guitar')?->content
            ?? $song?->chords?->firstWhere('instrument', 'keyboard')?->content
            ?? ''
    );
@endphp

<div class="space-y-6">
    @php
        $categories = $categories ?? collect();
        $selectedCategory = old('category_id', $song?->category_id ?? '');
    @endphp

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
            <x-input-label for="title" value="Título" class="text-slate-300" />
            <x-text-input id="title" name="title" type="text" class="mt-1 block w-full admin-input" :value="old('title', $song?->title ?? '')" required autofocus />
            <x-input-error class="mt-2" :messages="$errors->get('title')" />
        </div>
        <div>
            <x-input-label for="artist" value="Artista / Autor" class="text-slate-300" />
            <x-text-input id="artist" name="artist" type="text" class="mt-1 block w-full admin-input" :value="old('artist', $song?->artist ?? '')" required />
            <x-input-error class="mt-2" :messages="$errors->get('artist')" />
        </div>
        <div>
            <x-input-label for="category_id" value="Categoría" class="text-slate-300" />
            <select id="category_id" name="category_id" class="mt-1 block w-full admin-input text-sm">
                <option value="">Sin categoría</option>
                @foreach ($categories as $category)
                    <option value="{{ $category->id }}" @selected((string) $selectedCategory === (string) $category->id)>{{ $category->name }}</option>
                @endforeach
            </select>
            <x-input-error class="mt-2" :messages="$errors->get('category_id')" />
        </div>
        <div>
            <x-input-label for="key" value="Tono principal" class="text-slate-300" />
            @php
                $songKey = old('key', $song?->key ?? '');
                $keyOptions = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'];
            @endphp
            <select id="key" name="key" data-key-field required class="mt-1 block w-full admin-input font-mono text-sm">
                <option value="" disabled {{ $songKey === '' ? 'selected' : '' }}>Seleccionar tono…</option>
                @foreach ($keyOptions as $tone)
                    <option value="{{ $tone }}" @selected($songKey === $tone)>{{ $tone }}</option>
                @endforeach
                @if ($songKey && ! in_array($songKey, $keyOptions, true))
                    <option value="{{ $songKey }}" selected>{{ $songKey }}</option>
                @endif
            </select>
            <x-input-error class="mt-2" :messages="$errors->get('key')" />
        </div>
    </div>

    <div
        data-visual-chord-editor
        data-search-url="{{ route('chords.search') }}"
        class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c1222]"
    >
        <textarea data-initial-content class="hidden" readonly>{{ $chordProContent }}</textarea>
        <input type="hidden" name="content" data-content-field value="{{ $chordProContent }}">

        <div class="border-b border-white/5 px-4 py-3 sm:px-5">
            <h3 class="text-sm font-semibold text-white">Letra y cifrado</h3>
            <p class="mt-0.5 text-xs text-slate-500">Escribe la letra · busca acordes · arrástralos sobre cada línea en la vista previa</p>
        </div>

        {{-- Paleta de acordes --}}
        <div class="border-b border-white/5 bg-[#141c2e]/40 px-4 py-3 sm:px-5">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs font-medium uppercase tracking-wider text-slate-500">Acordes</span>
                <button
                    type="button"
                    data-add-chord
                    class="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-600/20 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-600/35"
                >
                    <span class="text-base leading-none">+</span> Buscar acorde
                </button>
            </div>
            <div data-chord-palette class="flex min-h-[36px] flex-wrap gap-2"></div>
            <p data-import-status class="mt-2 min-h-[1rem] text-xs"></p>
        </div>

        {{-- Letra + vista previa lado a lado --}}
        <div class="grid lg:grid-cols-2 lg:divide-x lg:divide-white/5">
            <div class="border-b border-white/5 p-4 sm:p-5 lg:border-b-0">
                <label for="lyrics-source" class="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">Letra</label>
                <textarea
                    id="lyrics-source"
                    data-lyrics-source
                    rows="18"
                    class="block min-h-[320px] w-full resize-y rounded-xl border border-white/10 bg-[#0a0f1a] p-4 font-mono text-sm leading-relaxed text-slate-100 placeholder-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                    placeholder="Escribe o pega la letra, una línea por verso…&#10;&#10;Tu fidelidad es grande&#10;Tu fidelidad incomparable es"
                ></textarea>
                <p class="mt-2 text-xs text-slate-600">Enter = nueva línea. También puedes pegar cifrado UG (acordes + letra).</p>
                <x-input-error class="mt-2" :messages="$errors->get('content')" />
            </div>

            <div class="p-4 sm:p-5">
                <div class="mb-3 flex items-center justify-between gap-2">
                    <h4 class="text-xs font-medium uppercase tracking-wider text-slate-500">Vista previa</h4>
                    <span class="text-xs text-slate-600">Arrastra acordes a la línea ámbar</span>
                </div>
                <div
                    data-visual-canvas
                    class="min-h-[320px] rounded-xl border border-dashed border-white/10 bg-[#0a0f1a] p-4 sm:p-5"
                ></div>
            </div>
        </div>

        {{-- Transposición --}}
        <details class="border-t border-white/5 p-4 sm:p-5">
            <summary class="cursor-pointer text-xs font-medium uppercase tracking-wider text-slate-500 transition hover:text-slate-400">
                Cambiar tonalidad (opcional)
            </summary>
            <div class="mt-4">
                <p class="mb-3 text-sm text-slate-300">
                    Tono: <span data-transpose-display-key class="font-mono font-semibold text-amber-400">—</span>
                </p>
                <div class="rounded-xl border border-white/10 bg-[#0a0f1a] p-3">
                    <div class="mb-2 grid grid-cols-2 gap-2">
                        <button type="button" data-transpose-half-down class="rounded-lg border border-white/10 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5">−1/2 tono</button>
                        <button type="button" data-transpose-half-up class="rounded-lg border border-white/10 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5">+1/2 tono</button>
                    </div>
                    <div class="grid grid-cols-6 gap-1.5">
                        @foreach (['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'] as $tone)
                            <button
                                type="button"
                                data-transpose-key="{{ $tone }}"
                                class="transpose-key-btn rounded-md border border-white/10 py-2 font-mono text-xs font-medium text-slate-400 transition hover:bg-white/5"
                            >{{ $tone }}</button>
                        @endforeach
                    </div>
                    <button
                        type="button"
                        data-transpose-reset
                        class="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5"
                    >
                        <span aria-hidden="true">↺</span> Restaurar
                    </button>
                </div>
            </div>
        </details>

        {{-- Buscador flotante --}}
        <div
            data-chord-floater
            class="pointer-events-none fixed inset-x-4 top-1/3 z-50 mx-auto hidden max-w-sm opacity-0 transition-opacity duration-150 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
            role="dialog"
            aria-label="Buscar acorde"
        >
            <div class="pointer-events-auto overflow-hidden rounded-xl border border-white/15 bg-[#141c2e] shadow-2xl shadow-black/50 ring-1 ring-violet-500/20">
                <div class="border-b border-white/5 px-3 py-2">
                    <input
                        type="search"
                        data-chord-search
                        placeholder="Buscar G, Em, C7…"
                        class="admin-input w-full text-sm"
                        autocomplete="off"
                    />
                    <p data-chord-status class="mt-1.5 text-xs text-slate-500">Escribe para buscar</p>
                </div>
                <div data-chord-results class="max-h-52 overflow-y-auto p-1.5"></div>
            </div>
        </div>
    </div>
</div>

@push('head')
    @vite(['resources/js/chord-visual-editor.js'])
@endpush
