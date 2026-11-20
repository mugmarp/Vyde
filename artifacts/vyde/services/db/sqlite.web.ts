// Metro selects this module on web, keeping the native SQLite/WASM dependency
// out of the AsyncStorage-backed browser preview.
export async function openLocalDatabase(): Promise<never> {
  throw new Error('Native SQLite is unavailable in the browser preview.');
}
