# Expo HAS CHANGED — read exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Commands
- `npm start` — dev server
- `npm run android` / `npm run ios` — dev builds (not Expo Go)
- `npx tsc --noEmit` — typecheck only (0 errors expected)
- No test, lint, or formatter configured

## Stack
- Expo SDK 56 / RN 0.85 / React 19.2.3 / Tamagui 2.3 / React Query 5 / FlashList 2
- `newArchEnabled: true` in app.json (required for FlashList v2; supported in Expo Go SDK 56)
- Babel: only `babel-preset-expo`, no plugins
- app.json plugins: only `expo-image`. Do NOT add `react-native-reanimated` (no app.plugin file in v4 — causes crash on `expo start`)

## Architecture
- **No Reanimated** — the app does not import or use any Reanimated API. Tamagui animations use `@tamagui/animations-react-native` (LayoutAnimation). Never install `react-native-reanimated` or `react-native-worklets`.
- **React Query + MMKV** — `createMMKV()` (not `new MMKV()`), `createSyncStoragePersister`, cache persisted in `queryClient.ts`. Query keys centralized in `src/queryKeys.ts` (factory pattern, no string literals).
- **Optimistic updates** — standard pattern across screens: `cancelQueries` → snapshot → `setQueryData` → rollback in `onError`, invalidate in `onSettled`.
- **API client** — `src/api.ts`: custom ApiClient, token from `expo-secure-store` (web: localStorage), 401 auto-logout, 15s timeout.
- **FlashList v2** — all list screens (Relays, Jobs, SavedLinks, Creators, Explorer). No `estimatedItemSize`/`getItemLayout` needed. List items extracted as separate `React.memo` components.
- **Navigation** — bottom tabs (Dashboard/Creators/Jobs/Relays) with fake stack: `CreatorsWrapper` component manages `CreatorDetailScreen` via state instead of navigation stack. No other nested navigation.
- **Error handling** — `ErrorBoundary` class component wrapping `AppNavigator` + `OfflineBanner` for network status. Toast for user-facing feedback.
- **Theme** — `TamaguiProvider` + custom `ThemeContext` for dark/light toggle.

## Key types (src/types.ts)
- `DashboardStats`, `RelayProfile`, `Job`, `Creator`, `SavedLink`, `PaginatedResponse<T>`
- API error: `ApiClientError` (has `.status`, `.message`)

## Logger (src/logger.ts)
- `react-native-logs` with `consoleTransport` (dev) / MMKV transport (prod)
- Usage: `import log from './logger'` then `const apiLog = log.extend('API')`
- Levels: `debug`, `info`, `warn`, `error` — production severity: `warn` only
- Logs stored in MMKV key `log-buffer`, visible via `storage.getString('log-buffer')`
- No `console.log` — use logger instead
