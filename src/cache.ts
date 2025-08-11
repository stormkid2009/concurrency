import { ReadWriteLock } from "./read-write.js";

// Cache with read-write lock
class ThreadSafeCache<K, V> {
  private cache = new Map<K, V>();
  private rwLock = new ReadWriteLock();

  async get(key: K): Promise<V | undefined> {
    return this.rwLock.withReadLock(async () => {
      return this.cache.get(key);
    });
  }

  async set(key: K, value: V): Promise<void> {
    await this.rwLock.withWriteLock(async () => {
      this.cache.set(key, value);
    });
  }

  async delete(key: K): Promise<boolean> {
    return this.rwLock.withWriteLock(async () => {
      return this.cache.delete(key);
    });
  }

  async has(key: K): Promise<boolean> {
    return this.rwLock.withReadLock(async () => {
      return this.cache.has(key);
    });
  }
}
