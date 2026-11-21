/** Per-key ordering prevents an old async snapshot from overwriting a new one. */
export function createOrderedWriter(
  write: (key: string, value: string) => Promise<void>,
) {
  const tails = new Map<string, Promise<void>>();
  return {
    write(key: string, value: string): Promise<void> {
      const previous = tails.get(key) ?? Promise.resolve();
      const next = previous.catch(() => {}).then(() => write(key, value));
      tails.set(key, next);
      const clear = () => {
        if (tails.get(key) === next) tails.delete(key);
      };
      void next.then(clear, clear);
      return next;
    },
  };
}
