import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { decode, encode } from '@toon-format/toon';
import { z } from 'zod';
import type { IndexStore, InferTables, SchemaMap } from '../types';
import { Query } from './query';

export class ToonDB<T extends SchemaMap> {
  private file: string;
  private schemas: T;
  public tables!: InferTables<T>;
  public indexes: IndexStore = {};

  constructor(file: string, schemas: T) {
    this.file = file;

    const newSchemas: any = {};
    for (const key in schemas) {
      newSchemas[key] = schemas[key].passthrough().extend({
        id: z.string(),
      });
    }

    this.schemas = newSchemas;

    this.load();

    for (const table in this.schemas) {
      this.createIndex(table, 'id');
    }
  }

  private load() {
    if (!fs.existsSync(this.file)) {
      this.tables = {} as InferTables<T>;

      for (const key in this.schemas) {
        this.tables[key] = [] as any;
      }

      this.save();
      return;
    }

    const raw = fs.readFileSync(this.file, 'utf-8');
    this.tables = decode(raw) as any as InferTables<T>;
  }

  private save() {
    const toon = encode(this.tables);
    fs.writeFileSync(this.file, toon);
  }

  table<K extends keyof T>(name: K) {
    return new Query<T, K>(this as any, name);
  }

  validate<K extends keyof T>(name: K, item: any) {
    const schema = (this.schemas as any)[name];
    return schema.parse(item);
  }

  generateId() {
    return randomUUID().replaceAll('-', '').slice(0, 5);
  }

  createIndex(table: string, field: string) {
    if (!this.indexes[table]) this.indexes[table] = {};
    this.indexes[table][field] = new Map();

    const rows = this.tables[table];

    for (const row of rows) {
      const key = (row as any)[field];

      if (!this.indexes[table]![field]!.has(key)) {
        this.indexes[table]![field]!.set(key, []);
      }

      this.indexes[table]![field]!.get(key)!.push(row);
    }
  }

  _addToIndex(table: string, row: any) {
    const tableIndexes = this.indexes[table];
    if (!tableIndexes) return;

    for (const field in tableIndexes) {
      const key = row[field];

      if (field === 'id' && tableIndexes[field]!.has(key)) {
        throw new Error(`Duplicate id "${key}"`);
      }

      if (!tableIndexes[field]!.has(key)) {
        tableIndexes[field]!.set(key, []);
      }

      tableIndexes[field]!.get(key)!.push(row);
    }
  }

  _removeFromIndex(table: string, row: any) {
    const tableIndexes = this.indexes[table];
    if (!tableIndexes) return;

    for (const field in tableIndexes) {
      const key = row[field];
      const arr = tableIndexes[field]!.get(key);

      if (!arr) continue;

      const newArr = arr.filter((x: any) => x !== row);
      if (newArr.length === 0) {
        tableIndexes[field]!.delete(key);
      } else {
        tableIndexes[field]!.set(key, newArr);
      }
    }
  }

  _updateIndex(table: string, oldRow: any, newRow: any) {
    this._removeFromIndex(table, oldRow);
    this._addToIndex(table, newRow);
  }

  findBy(table: string, field: string, value: any) {
    return this.indexes[table]?.[field]?.get(value) || [];
  }
}
