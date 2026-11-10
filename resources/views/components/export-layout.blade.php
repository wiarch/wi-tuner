<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $title ?? config('app.name') }}</title>
        @stack('head')
        @vite(['resources/css/app.css'])
    </head>
    <body class="song-export-body font-sans antialiased">
        {{ $slot }}
    </body>
</html>
