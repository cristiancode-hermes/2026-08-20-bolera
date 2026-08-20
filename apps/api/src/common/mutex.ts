/** Serializes atomic ops on better-sqlite3 (single connection). */
export class Mutex {
  private chain: Promise<unknown> = Promise.resolve();

  run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.chain.then(fn);
    this.chain = result.catch(() => undefined);
    return result;
  }
}
