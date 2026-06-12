# Unamuno Kluba PWA - MVP

PWA móvil en euskera para gestión interna de un club de baloncesto.

## Incluye

- React + TypeScript + Vite
- Preparado para Supabase Auth, Database, Storage y Realtime
- Login demo con fallback si no hay `.env`
- Roles: `coach` y `coordinator`
- Nire taldea / Taldeen jarraipena
- Tabla de asistencia con exportación Excel
- Asteburuko partidak
- Ordutegiak
- Baliabideak
- Berriak
- Aldaketa eskaerak
- Jakinarazpenak
- i18n preparado con selector oculto

## Instalación

```bash
npm install
npm run dev
```

## Supabase

1. Crea un proyecto en Supabase.
2. Copia `.env.example` a `.env`.
3. Rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Ejecuta `supabase/schema.sql` en el SQL Editor.
5. Crea un bucket de Storage llamado `club-documents` para PDFs e imágenes.

## Nota importante

Esta versión es un MVP-esqueleto funcional. Las pantallas ya existen y la arquitectura está preparada, pero los formularios completos, subida real de PDFs/vídeos y realtime deben conectarse en la siguiente iteración.
