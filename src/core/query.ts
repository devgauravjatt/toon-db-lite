import type { z } from 'zod';
import type { SchemaMap, TableItem } from '../types';

export class Query<T extends SchemaMap, K extends keyof T> {
  private db: any;
  private name: K;
  private data: TableItem<T, K>[];

  constructor(db: any, name: K) {
    this.db = db;
    this.name = name;
    this.data = db.tables[name];
  }

  where(fn: (item: TableItem<T, K>) => boolean) {
    const optimized = this.tryOptimize(fn);

    if (optimized) {
      const { field, value } = optimized;
      const indexed = this.db.findBy(this.name, field, value);

      if (indexed.length) {
        this.data = indexed;
        return this;
      }
    }

    this.data = this.data.filter(fn);
    return this;
  }

  tryOptimize(fn: Function) {
    const str = fn.toString();

    const match = str.match(/\.([a-zA-Z0-9_]+)\s*===\s*['"`](.+?)['"`]/);

    if (!match) return null;

    const field = match[1];
    const value = match[2];

    if (!this.db.indexes?.[this.name]?.[field]) return null;

    return { field, value };
  }

  insert(item: z.infer<T[K]>):
    | { data: TableItem<T, K>; error: null }
    | {
        data: null;
        error: { message: string; zodError: z.ZodIssue[] | null };
      } {
    try {
      const newItem = {
        id: this.db.generateId(),
        ...(item as any),
      };

      const valid = this.db.validate(this.name, newItem);

      this.db.tables[this.name].push(valid);
      this.db._addToIndex(this.name, valid);

      this.db.save?.();

      return {
        data: valid,
        error: null,
      };
    } catch (err: any) {
      let zodError = err.errors || err.issues;
      if (!zodError && err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (Array.isArray(parsed)) zodError = parsed;
          // oxlint-disable-next-line no-empty
        } catch {}
      }

      if (zodError) {
        return {
          data: null,
          error: {
            message: 'Validation failed',
            zodError: zodError,
          },
        };
      }

      return {
        data: null,
        error: {
          message: err.message || 'Unknown error',
          zodError: null,
        },
      };
    }
  }

  update(
    fn: (item: TableItem<T, K>) => boolean,
    data: Partial<z.infer<T[K]>>,
  ):
    | { data: TableItem<T, K>[]; error: null }
    | {
        data: null;
        error: { message: string; zodError: z.ZodIssue[] | null };
      } {
    try {
      const table = this.db.tables[this.name];
      const updated = [];

      for (let i = 0; i < table.length; i++) {
        if (fn(table[i])) {
          const oldRow = table[i];
          const newRow = { ...oldRow, ...(data as any) };

          const valid = this.db.validate(this.name, newRow);

          table[i] = valid;
          this.db._updateIndex(this.name, oldRow, valid);

          updated.push(valid);
        }
      }

      this.db.save?.();

      return { data: updated, error: null };
    } catch (err: any) {
      let zodError = err.errors || err.issues;
      if (!zodError && err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (Array.isArray(parsed)) zodError = parsed;
          // oxlint-disable-next-line no-empty
        } catch {}
      }

      if (zodError) {
        return {
          data: null,
          error: {
            message: 'Validation failed',
            zodError: zodError,
          },
        };
      }

      return {
        data: null,
        error: {
          message: err.message || 'Unknown error',
          zodError: null,
        },
      };
    }
  }

  delete(fn: (item: TableItem<T, K>) => boolean) {
    const table = this.db.tables[this.name];

    for (const row of table) {
      if (fn(row)) {
        this.db._removeFromIndex(this.name, row);
      }
    }

    this.db.tables[this.name] = table.filter((x: TableItem<T, K>) => !fn(x));

    return { data: true, error: null };
  }

  findBy(field: string, value: any) {
    this.data = this.db.findBy(this.name, field, value);
    return this;
  }

  all(): TableItem<T, K>[] {
    return this.data;
  }

  first(): TableItem<T, K> | undefined {
    return this.data[0];
  }
}
