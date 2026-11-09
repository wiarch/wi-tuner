import $ from 'jquery';
import 'select2';
import 'select2/dist/css/select2.min.css';

window.$ = window.jQuery = $;

const DEFAULT_OPTS = {
    width: '100%',
    minimumResultsForSearch: 8,
    dropdownParent: $(document.body),
    language: {
        noResults: () => 'Sin resultados',
        searching: () => 'Buscando…',
    },
};

function shouldEnhance(select) {
    if (select.dataset.nativeSelect !== undefined) {
        return false;
    }

    const size = Number(select.getAttribute('size') ?? 0);
    if (size > 1) {
        return false;
    }

    return select.classList.contains('admin-input');
}

export function initSelect2(scope = document) {
    const root = scope instanceof Element ? scope : document;

    root.querySelectorAll('select.admin-input').forEach((select) => {
        if (!shouldEnhance(select)) {
            return;
        }

        const $el = $(select);
        if ($el.hasClass('select2-hidden-accessible')) {
            return;
        }

        const opts = { ...DEFAULT_OPTS };
        const emptyOption = select.querySelector('option[value=""]');

        if (emptyOption) {
            opts.placeholder = emptyOption.textContent?.trim() || 'Seleccionar…';
            opts.allowClear = !select.required;
        }

        $el.select2(opts);
    });
}

export function destroySelect2(scope = document) {
    const root = scope instanceof Element ? scope : document;

    root.querySelectorAll('select.select2-hidden-accessible').forEach((select) => {
        $(select).select2('destroy');
    });
}

function boot() {
    initSelect2();
    window.wituner = {
        ...(window.wituner ?? {}),
        initSelect2,
        destroySelect2,
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
