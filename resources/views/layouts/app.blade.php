<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Laravel') }}</title>

        @stack('head')

        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="font-sans antialiased bg-[#0a0f1a] text-slate-200 @stack('body-class')">
        <input type="checkbox" id="sidebar-toggle" class="sidebar-toggle peer hidden" aria-hidden="true">

        <label for="sidebar-toggle" class="sidebar-backdrop fixed inset-0 z-30 hidden bg-black/60 lg:hidden peer-checked:block" aria-label="Cerrar menú"></label>

        @include('layouts.partials.sidebar')

        <div class="lg:pl-64">
            @include('layouts.partials.topbar')

            <main class="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
                @isset($header)
                    <div class="mb-6">{{ $header }}</div>
                @endisset

                {{ $slot }}
            </main>
        </div>

        <details class="fab-menu fixed bottom-6 right-6 z-50">
            <summary class="flex h-14 w-14 cursor-pointer list-none items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/40 transition hover:bg-violet-500 [&::-webkit-details-marker]:hidden">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </summary>
            <div class="absolute bottom-16 right-0 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#141c2e] shadow-2xl">
                <a href="{{ route('songs.create') }}" class="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                    <span class="text-violet-400">♪</span> Nueva canción
                </a>
                <a href="{{ route('service-plans.create') }}" class="flex items-center gap-2 border-t border-white/5 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                    <span class="text-violet-400">📋</span> Nuevo plan
                </a>
            </div>
        </details>

        @stack('scripts')
    </body>
</html>
