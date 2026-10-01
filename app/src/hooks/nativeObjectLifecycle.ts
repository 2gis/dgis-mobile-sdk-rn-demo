export interface Destroyable {
  destroy(): void;
}

export function isNativeDestroyedError(error: unknown): boolean {
  return (
    error instanceof Error && error.message === 'Native object was destroyed'
  );
}

export function destroyIfPresent(target: Destroyable | null | undefined): void {
  target?.destroy();
}

export function destroyAll<T extends Destroyable>(items: Iterable<T>): void {
  for (const item of items) {
    destroyIfPresent(item);
  }
}

export function ignoreNativeDestroyedError(action: () => void): void {
  try {
    action();
  } catch (error) {
    if (!isNativeDestroyedError(error)) {
      throw error;
    }
  }
}
