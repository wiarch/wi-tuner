<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Plataforma de acordes de alabanza y gestión de servicios para tu equipo de adoración.">

    <title>{{ config('app.name', 'Wi-Tuner') }} — Acordes y servicios de adoración</title>

    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="font-sans antialiased bg-slate-950 text-slate-100">

    {{-- Nav --}}
    <header class="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <a href="{{ route('home') }}" class="flex items-center gap-2">
                <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">Wi</span>
                <span class="text-lg font-semibold tracking-tight">{{ config('app.name') }}</span>
            </a>

            <nav class="flex items-center gap-3">
                @auth
                    <a href="{{ route('dashboard') }}" class="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white">
                        Dashboard
                    </a>
                @else
                    <a href="{{ route('login') }}" class="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white">
                        Iniciar sesión
                    </a>
                    @if (Route::has('register'))
                        <a href="{{ route('register') }}" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500">
                            Registrarse
                        </a>
                    @endif
                @endauth
            </nav>
        </div>
    </header>

    <main>

        {{-- Hero --}}
        <section class="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
            <div class="pointer-events-none absolute inset-0">
                <div class="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl"></div>
                <div class="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-3xl"></div>
            </div>

            <div class="relative mx-auto max-w-7xl px-6 text-center">
                <p class="mb-4 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
                    Cifra Club + Planning Center para tu iglesia
                </p>

                <h1 class="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Adora con claridad.<br>
                    <span class="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Organiza cada servicio.</span>
                </h1>

                <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
                    Crea repertorios, consulta acordes de guitarra y teclado, y arma planes de dirección para que tu equipo llegue al altar preparado.
                </p>

                <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    @if (Route::has('register'))
                        <a href="{{ route('register') }}" class="w-full rounded-xl bg-indigo-600 px-8 py-3.5 text-center text-base font-semibold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-500 sm:w-auto">
                            Comenzar gratis
                        </a>
                    @endif
                    <a href="{{ route('login') }}" class="w-full rounded-xl border border-white/15 bg-white/5 px-8 py-3.5 text-center text-base font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto">
                        Iniciar sesión
                    </a>
                </div>

                {{-- Value props --}}
                <div class="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
                    <div class="rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur">
                        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.5.375a2.25 2.25 0 01-2.163-1.632L12.75 15v-3.75m0 0l-10.5-3m10.5 3l-10.5 3" /></svg>
                        </div>
                        <h3 class="font-semibold text-white">Repertorios</h3>
                        <p class="mt-1 text-sm text-slate-400">Arma listas por servicio, fecha o equipo de adoración.</p>
                    </div>
                    <div class="rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur">
                        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
                        </div>
                        <h3 class="font-semibold text-white">Acordes</h3>
                        <p class="mt-1 text-sm text-slate-400">Guitarra y teclado en la misma canción, siempre actualizados.</p>
                    </div>
                    <div class="rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur">
                        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20 text-amber-400">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                        </div>
                        <h3 class="font-semibold text-white">Plan de dirección</h3>
                        <p class="mt-1 text-sm text-slate-400">Flujo del servicio, momentos y transiciones en un solo lugar.</p>
                    </div>
                </div>
            </div>
        </section>

        {{-- Features --}}
        <section class="border-t border-white/10 bg-slate-900/50 py-20 lg:py-28">
            <div class="mx-auto max-w-7xl px-6">
                <div class="text-center">
                    <h2 class="text-3xl font-bold text-white sm:text-4xl">Todo lo que necesitas en el altar</h2>
                    <p class="mx-auto mt-4 max-w-xl text-slate-400">Herramientas pensadas para músicos, directores y líderes de adoración.</p>
                </div>

                <div class="mt-16 grid gap-8 md:grid-cols-3">
                    <article class="group rounded-2xl border border-white/10 bg-slate-950 p-8 transition hover:border-indigo-500/40 hover:bg-slate-900">
                        <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                        </div>
                        <h3 class="text-xl font-semibold text-white">Buscador de canciones</h3>
                        <p class="mt-3 text-slate-400 leading-relaxed">
                            Encuentra alabanzas por título, autor o tonalidad. Filtra por tempo, idioma o etiquetas de tu ministerio.
                        </p>
                    </article>

                    <article class="group rounded-2xl border border-white/10 bg-slate-950 p-8 transition hover:border-violet-500/40 hover:bg-slate-900">
                        <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                        </div>
                        <h3 class="text-xl font-semibold text-white">Transposición de tonos</h3>
                        <p class="mt-3 text-slate-400 leading-relaxed">
                            Cambia la tonalidad al instante para adaptarte a la voz del líder o al instrumento disponible ese domingo.
                        </p>
                    </article>

                    <article class="group rounded-2xl border border-white/10 bg-slate-950 p-8 transition hover:border-amber-500/40 hover:bg-slate-900">
                        <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                        </div>
                        <h3 class="text-xl font-semibold text-white">Vista para el altar</h3>
                        <p class="mt-3 text-slate-400 leading-relaxed">
                            Modo móvil optimizado: letra grande, acordes visibles y scroll suave para usar desde el celular en el escenario.
                        </p>
                    </article>
                </div>
            </div>
        </section>

        {{-- CTA --}}
        <section class="py-20 lg:py-28">
            <div class="mx-auto max-w-4xl px-6 text-center">
                <div class="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/20 to-violet-600/20 px-8 py-16 backdrop-blur">
                    <h2 class="text-3xl font-bold text-white sm:text-4xl">Tu equipo merece llegar preparado</h2>
                    <p class="mx-auto mt-4 max-w-lg text-slate-300">
                        Únete a Wi-Tuner y deja de improvisar los domingos. Centraliza acordes, repertorios y planes en una sola plataforma.
                    </p>
                    <div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        @if (Route::has('register'))
                            <a href="{{ route('register') }}" class="w-full rounded-xl bg-white px-8 py-3.5 text-center text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50 sm:w-auto">
                                Crear cuenta gratis
                            </a>
                        @endif
                        <a href="{{ route('login') }}" class="w-full rounded-xl border border-white/30 px-8 py-3.5 text-center text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto">
                            Ya tengo cuenta
                        </a>
                    </div>
                </div>
            </div>
        </section>

    </main>

    <footer class="border-t border-white/10 py-8">
        <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
            <p class="text-sm text-slate-500">&copy; {{ date('Y') }} {{ config('app.name') }}. Todos los derechos reservados.</p>
            <div class="flex gap-6 text-sm text-slate-500">
                <a href="{{ route('login') }}" class="transition hover:text-slate-300">Iniciar sesión</a>
                @if (Route::has('register'))
                    <a href="{{ route('register') }}" class="transition hover:text-slate-300">Registrarse</a>
                @endif
            </div>
        </div>
    </footer>

</body>
</html>
