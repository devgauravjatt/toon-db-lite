# ⚡ Toon DB Lite

> A lightning-fast, file-based database powered by the **TOON format** (faster than JSON) with built-in indexing and a smart query optimizer.

[![npm version](https://img.shields.io/npm/v/toon-db-lite.svg)](https://www.npmjs.com/package/toon-db-lite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## ✨ Features

- 🆔 **Auto ID Generation** - Automatic `id` field (short 5-char UUID) for all records.
- ⚡ **Faster than JSON** - Uses the [TOON format](https://github.com/toon-format/toon) for high-performance data serialization.
- 🔍 **Built-in Indexing** - Fast lookups with automatic indexing on `id` and custom fields.
- 🧠 **Smart Query Optimizer** - Automatically detects equality checks in `.where()` and uses indexes for speed.
- 🧩 **Zod Validation** - Type-safe schemas and validation out of the box.
- ✅ **Result-based API** - Clean `{ data, error }` pattern (no more `try/catch` blocks).

---

## 📦 Install

```bash
# npm
npm install toon-db-lite
```

---

## 🚀 Quick Start

```ts
import { ToonDB } from 'toon-db-lite';
import { z } from 'zod';

// 1. Define your schemas
const userSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 chars'),
  age: z.number().min(18, 'Age must be 18+'),
});

// 2. Initialize DB
const db = new ToonDB('db.toon', {
  user: userSchema,
});

// 3. Insert data (ID is auto-generated!)
const { data, error } = db.table('user').insert({
  name: 'Gaurav',
  age: 19,
});

if (error) {
  console.error('Validation failed:', error.zodError);
} else {
  console.log('User created:', data.id); // e.g., 'a1b2c'
}
```

---

## 🔍 Queries & Operations

### Find Records

```ts
// Find by ID (⚡ auto-indexed)
const user = db
  .table('user')
  .where((u) => u.id === 'a1b2c')
  .first();

// Find by field (uses optimizer if indexed)
const results = db
  .table('user')
  .where((u) => u.name === 'Gaurav')
  .all();

// Direct index lookup (manual optimization)
const users = db.table('user').findBy('name', 'Gaurav').all();
```

### Update & Delete

```ts
// Update multiple records
db.table('user').update((u) => u.age < 20, { status: 'young' });

// Delete records
db.table('user').delete((u) => u.id === 'some-id');
```

---

## 🧠 Smart Query Optimizer

ToonDB Lite includes a regex-based query optimizer. It automatically detects simple equality checks in your `.where()` callbacks and switches to an indexed lookup if available.

```ts
// ⚡ This will be automatically optimized to use the 'name' index!
db.table('user')
  .where((u) => u.name === 'Gaurav')
  .all();
```

To enable optimization for custom fields, create an index:

```ts
db.createIndex('user', 'name');
```

---

## ⚡ TOON vs JSON

| Feature     | TOON ⚡                   | JSON 🐢               |
| :---------- | :------------------------ | :-------------------- |
| **Speed**   | 🚀 Significantly Faster   | 🐢 Standard           |
| **Size**    | 📉 Smaller Footprint      | 📈 Larger             |
| **Parsing** | ⚡ Efficient Stream-ready | 🐢 Blocks Main Thread |

Learn more about the format: [toon-format](https://github.com/toon-format/toon)

---

## 🛠️ API Reference

### `ToonDB(filename, schemas)`

Initializes the database.

- `filename`: Path to the `.toon` file.
- `schemas`: An object where keys are table names and values are Zod schemas.

### `db.table(tableName)`

Returns a `Query` object for the specified table.

### `Query` Methods

- `.where(predicate)`: Filter records. Optimized for `(x) => x.field === 'value'`.
- `.insert(data)`: Add a new record. Returns `{ data, error }`.
- `.update(predicate, data)`: Update matching records. Returns `{ data, error }`.
- `.delete(predicate)`: Remove matching records.
- `.all()`: Returns all results from the current query.
- `.first()`: Returns the first result or `undefined`.
- `.findBy(field, value)`: Direct index-based search.

### `db.createIndex(tableName, field)`

Manually create an index for a field to speed up queries.

---

## 📜 License

MIT © [devgauravjatt](https://github.com/devgauravjatt)
