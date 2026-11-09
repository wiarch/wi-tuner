/**
 * Constructor de setlist: secciones, canciones, buscador, drag & drop.
 */

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function keyOptionsHtml(keys, selected) {
    return keys
        .map((key) => `<option value="${escapeHtml(key)}" ${key === selected ? 'selected' : ''}>${escapeHtml(key)}</option>`)
        .join('');
}

function contactOptionsHtml(contacts, selected) {
    const opts = ['<option value="">Sin asignar</option>'];
    contacts.forEach((contact) => {
        const label = contact.vocal_tone ? `${contact.name} (${contact.vocal_tone})` : contact.name;
        const role = contact.role ? ` · ${contact.role}` : '';
        opts.push(
            `<option value="${contact.id}" ${Number(selected) === Number(contact.id) ? 'selected' : ''}>${escapeHtml(label + role)}</option>`,
        );
    });
    return opts.join('');
}

export function initServicePlanBuilder(root) {
    const mode = root.dataset.mode ?? 'create';
    const searchUrl = root.dataset.searchUrl;
    const syncUrl = root.dataset.syncUrl ?? '';
    const csrf = root.dataset.csrf ?? '';
    const planId = root.dataset.planId ?? '';

    const listEl = root.querySelector('[data-setlist]');
    const hiddenInput = root.querySelector('[data-entries-json]');
    const directorSelect = root.querySelector('[data-director-select]');
    const searchInput = root.querySelector('[data-song-search]');
    const searchResults = root.querySelector('[data-song-results]');
    const sectionTitleInput = root.querySelector('[data-section-title]');
    const form = root.closest('form');
    const saveBtn = root.querySelector('[data-save-setlist]');
    const saveStatus = root.querySelector('[data-save-status]');

    const config = JSON.parse(root.querySelector('[data-builder-config]')?.textContent || '{}');
    const contacts = config.contacts ?? [];
    const musicalKeys = config.musicalKeys ?? [];

    let entries = JSON.parse(root.querySelector('[data-initial-entries]')?.textContent || '[]');
    let dragItem = null;
    let searchTimer = null;

    function usedSongIds() {
        return new Set(entries.filter((e) => e.type === 'song').map((e) => Number(e.song_id)));
    }

    function syncHidden() {
        if (!hiddenInput) {
            return;
        }
        hiddenInput.value = JSON.stringify(
            entries.map((entry) => {
                if (entry.type === 'section') {
                    return { type: 'section', section_title: entry.section_title };
                }
                return {
                    type: 'song',
                    song_id: entry.song_id,
                    performance_key: entry.performance_key ?? entry.original_key ?? '',
                    contact_id: entry.contact_id ?? null,
                };
            }),
        );
    }

    function songCount() {
        return entries.filter((e) => e.type === 'song').length;
    }

    function renderEmpty() {
        return '<p class="p-8 text-center text-sm text-slate-500">Añade un subtítulo o busca canciones para armar el plan.</p>';
    }

    function renderSongRow(entry, index, displayOrder) {
        const key = entry.performance_key ?? entry.original_key ?? '';
        const extraKey =
            key && !musicalKeys.includes(key)
                ? `<option value="${escapeHtml(key)}" selected>${escapeHtml(key)}</option>`
                : '';

        return `<li data-entry-index="${index}" class="group rounded-xl border border-white/10 bg-[#0a0f1a] p-4">
            <div class="flex items-start gap-3">
                <button type="button" data-drag-handle class="mt-1 cursor-grab text-slate-600 hover:text-slate-400 active:cursor-grabbing" aria-label="Reordenar">⠿</button>
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-semibold text-violet-300">${displayOrder}</span>
                <div class="min-w-0 flex-1 space-y-3">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p class="font-medium text-slate-200">${escapeHtml(entry.title)}</p>
                            <p class="text-sm text-slate-500">${escapeHtml(entry.artist)}${entry.category ? ` · <span class="text-amber-400/90">${escapeHtml(entry.category)}</span>` : ''}</p>
                        </div>
                        <button type="button" data-remove-entry="${index}" class="text-xs text-slate-500 hover:text-red-300">Quitar</button>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label class="block text-xs text-slate-500">Tono en servicio</label>
                            <select data-entry-key="${index}" class="mt-1 block w-full admin-input text-sm font-mono">
                                ${keyOptionsHtml(musicalKeys, key)}${extraKey}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs text-slate-500">Quién canta / dirige</label>
                            <select data-entry-contact="${index}" class="mt-1 block w-full admin-input text-sm">
                                ${contactOptionsHtml(contacts, entry.contact_id)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </li>`;
    }

    function renderSectionRow(entry, index) {
        return `<li data-entry-index="${index}" class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div class="flex items-center gap-3">
                <button type="button" data-drag-handle class="cursor-grab text-amber-500/60 hover:text-amber-400 active:cursor-grabbing" aria-label="Reordenar">⠿</button>
                <div class="min-w-0 flex-1">
                    <input
                        type="text"
                        data-section-edit="${index}"
                        value="${escapeHtml(entry.section_title ?? '')}"
                        placeholder="Ej: Adoraciones, Coros del medio tiempo…"
                        class="w-full border-0 bg-transparent text-lg font-semibold text-amber-200 placeholder-amber-200/40 focus:outline-none focus:ring-0"
                    />
                </div>
                <button type="button" data-remove-entry="${index}" class="text-xs text-slate-500 hover:text-red-300">×</button>
            </div>
        </li>`;
    }

    function render() {
        if (!listEl) {
            return;
        }

        if (!entries.length) {
            listEl.innerHTML = renderEmpty();
            syncHidden();
            return;
        }

        let songOrder = 0;
        listEl.innerHTML = entries
            .map((entry, index) => {
                if (entry.type === 'section') {
                    return renderSectionRow(entry, index);
                }
                songOrder += 1;
                return renderSongRow(entry, index, songOrder);
            })
            .join('');

        bindListInteractions();
        syncHidden();
        window.wituner?.initSelect2(listEl);
    }

    function bindListInteractions() {
        listEl.querySelectorAll('[data-remove-entry]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const index = Number(btn.dataset.removeEntry);
                entries.splice(index, 1);
                render();
            });
        });

        listEl.querySelectorAll('[data-section-edit]').forEach((input) => {
            input.addEventListener('input', () => {
                const index = Number(input.dataset.sectionEdit);
                if (entries[index]) {
                    entries[index].section_title = input.value;
                    syncHidden();
                }
            });
        });

        listEl.querySelectorAll('[data-entry-key]').forEach((select) => {
            select.addEventListener('change', () => {
                const index = Number(select.dataset.entryKey);
                if (entries[index]) {
                    entries[index].performance_key = select.value;
                    syncHidden();
                }
            });
        });

        listEl.querySelectorAll('[data-entry-contact]').forEach((select) => {
            select.addEventListener('change', () => {
                const index = Number(select.dataset.entryContact);
                if (entries[index]) {
                    entries[index].contact_id = select.value ? Number(select.value) : null;
                    syncHidden();
                }
            });
        });

        listEl.querySelectorAll('[data-entry-index]').forEach((item) => {
            item.setAttribute('draggable', 'true');

            item.addEventListener('dragstart', () => {
                dragItem = item;
                item.classList.add('opacity-50');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('opacity-50');
                dragItem = null;
            });

            item.addEventListener('dragover', (event) => {
                event.preventDefault();
                if (!dragItem || dragItem === item) {
                    return;
                }
                const rect = item.getBoundingClientRect();
                const after = event.clientY > rect.top + rect.height / 2;
                listEl.insertBefore(dragItem, after ? item.nextSibling : item);
            });

            item.addEventListener('drop', (event) => {
                event.preventDefault();
                const order = [...listEl.querySelectorAll('[data-entry-index]')].map((el) =>
                    Number(el.dataset.entryIndex),
                );
                const reordered = order.map((i) => entries[i]);
                entries = reordered;
                render();
            });
        });
    }

    function addSection(title = '') {
        const trimmed = title.trim();
        if (!trimmed) {
            return;
        }
        entries.push({ type: 'section', section_title: trimmed });
        render();
        if (sectionTitleInput) {
            sectionTitleInput.value = '';
        }
    }

    function addSong(song) {
        if (!song?.id || usedSongIds().has(Number(song.id))) {
            return;
        }
        entries.push({
            type: 'song',
            song_id: song.id,
            title: song.title,
            artist: song.artist,
            original_key: song.key,
            performance_key: song.key,
            category: song.category ?? null,
            contact_id: null,
        });
        render();
        if (searchInput) {
            searchInput.value = '';
        }
        if (searchResults) {
            searchResults.innerHTML = '';
        }
    }

    async function fetchSongs(query) {
        if (!searchUrl || !searchResults) {
            return;
        }

        const url = new URL(searchUrl, window.location.origin);
        if (query) {
            url.searchParams.set('q', query);
        }
        if (planId) {
            url.searchParams.set('plan', planId);
        }

        searchResults.innerHTML = '<p class="px-3 py-2 text-xs text-slate-500">Buscando…</p>';

        try {
            const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
            if (!response.ok) {
                throw new Error('search failed');
            }
            const songs = await response.json();
            if (!songs.length) {
                searchResults.innerHTML = '<p class="px-3 py-2 text-xs text-slate-500">Sin canciones.</p>';
                return;
            }

            searchResults.innerHTML = songs
                .map(
                    (song) => `<button type="button" data-add-song-id="${song.id}" class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5">
                        <span class="min-w-0">
                            <span class="block font-medium">${escapeHtml(song.title)}</span>
                            <span class="block text-xs text-slate-500">${escapeHtml(song.artist)} · <span class="font-mono text-amber-300">${escapeHtml(song.key)}</span>${song.category ? ` · ${escapeHtml(song.category)}` : ''}</span>
                        </span>
                        <span class="shrink-0 text-xs text-violet-400">+ Añadir</span>
                    </button>`,
                )
                .join('');

            searchResults.querySelectorAll('[data-add-song-id]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const song = songs.find((s) => Number(s.id) === Number(btn.dataset.addSongId));
                    if (song) {
                        addSong(song);
                    }
                });
            });
        } catch {
            searchResults.innerHTML = '<p class="px-3 py-2 text-xs text-red-400">Error al buscar.</p>';
        }
    }

    async function persistSetlist() {
        if (!syncUrl) {
            return true;
        }

        const payload = {
            entries: JSON.parse(hiddenInput?.value || '[]'),
            director_contact_id: directorSelect?.value ? Number(directorSelect.value) : null,
        };

        const response = await fetch(syncUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrf,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            if (saveStatus) {
                saveStatus.textContent = 'Error al guardar.';
                saveStatus.className = 'text-xs text-red-400';
            }
            return false;
        }

        if (saveStatus) {
            saveStatus.textContent = 'Guardado.';
            saveStatus.className = 'text-xs text-emerald-400';
            window.setTimeout(() => {
                if (saveStatus.textContent === 'Guardado.') {
                    saveStatus.textContent = '';
                }
            }, 2500);
        }

        return true;
    }

    root.querySelector('[data-add-section]')?.addEventListener('click', () => {
        addSection(sectionTitleInput?.value ?? '');
    });

    sectionTitleInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addSection(sectionTitleInput.value);
        }
    });

    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => fetchSongs(searchInput.value.trim()), 200);
    });

    searchInput?.addEventListener('focus', () => {
        if (!searchResults?.innerHTML) {
            fetchSongs('');
        }
    });

    saveBtn?.addEventListener('click', async () => {
        saveBtn.disabled = true;
        await persistSetlist();
        saveBtn.disabled = false;
    });

    form?.addEventListener('submit', (event) => {
        if (mode !== 'create') {
            return;
        }
        syncHidden();
        if (!entries.some((e) => e.type === 'song')) {
            event.preventDefault();
            alert('Añade al menos una canción al plan.');
        }
    });

    render();
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-service-plan-builder]').forEach(initServicePlanBuilder);
});
