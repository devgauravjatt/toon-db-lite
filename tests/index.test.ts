import { expect, test } from '@rstest/core';
import { z } from 'zod';
import { ToonDB } from '../src/index'; // Import from src for testing
import fs from 'node:fs';

const userSchema = z.object({
  name: z.string().min(3),
  age: z.number().min(18),
});

const DB_FILE = 'test.toon';

// Helper to cleanup test DB
const cleanup = () => {
  if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
};

test('1. Insert: should add a user and return data with auto-generated id', () => {
  cleanup();
  const db = new ToonDB(DB_FILE, { user: userSchema });
  const { data, error } = db.table('user').insert({ name: 'Gaurav', age: 25 });

  expect(error).toBe(null);
  expect(data?.name).toBe('Gaurav');
  expect(data?.id).toBeDefined();
  expect(typeof data?.id).toBe('string');
});

test('2. Validation: should fail when inserting invalid data', () => {
  cleanup();
  const db = new ToonDB(DB_FILE, { user: userSchema });
  const { data, error } = db.table('user').insert({ name: 'A', age: 10 });

  expect(data).toBe(null);
  expect(error?.message).toBe('Validation failed');
  expect(error?.zodError).toBeDefined();
});

test('3. Find (All): should retrieve all users', () => {
  cleanup();
  const db = new ToonDB(DB_FILE, { user: userSchema });
  db.table('user').insert({ name: 'User 1', age: 20 });
  db.table('user').insert({ name: 'User 2', age: 30 });

  const all = db.table('user').all();
  expect(all.length).toBe(2);
});

test('4. Find (Where): should filter users by name', () => {
  cleanup();
  const db = new ToonDB(DB_FILE, { user: userSchema });
  db.table('user').insert({ name: 'Gaurav', age: 25 });
  db.table('user').insert({ name: 'John', age: 30 });

  const results = db
    .table('user')
    .where((u) => u.name === 'Gaurav')
    .all();
  expect(results.length).toBe(1);
  expect(results[0].name).toBe('Gaurav');
});

test('5. Find (First): should return the first matching user', () => {
  cleanup();
  const db = new ToonDB(DB_FILE, { user: userSchema });
  db.table('user').insert({ name: 'Gaurav', age: 25 });
  db.table('user').insert({ name: 'Gaurav', age: 30 });

  const first = db
    .table('user')
    .where((u) => u.name === 'Gaurav')
    .first();
  expect(first?.age).toBe(25);
});

test('6. Update: should update user data correctly', () => {
  cleanup();
  const db = new ToonDB(DB_FILE, { user: userSchema });
  const { data } = db.table('user').insert({ name: 'Gaurav', age: 25 });
  const id = data!.id;

  const { data: updatedData } = db.table('user').update((u) => u.id === id, { age: 26 });
  expect(updatedData?.[0].age).toBe(26);

  const check = db
    .table('user')
    .where((u) => u.id === id)
    .first();
  expect(check?.age).toBe(26);
});

test('7. Delete: should remove user from table', () => {
  cleanup();
  const db = new ToonDB(DB_FILE, { user: userSchema });
  const { data } = db.table('user').insert({ name: 'Gaurav', age: 25 });
  const id = data!.id;

  db.table('user').delete((u) => u.id === id);
  const check = db
    .table('user')
    .where((u) => u.id === id)
    .first();
  expect(check).toBeUndefined();
});

test('8. Persistence: should load data from file on initialization', () => {
  cleanup();
  {
    const db = new ToonDB(DB_FILE, { user: userSchema });
    db.table('user').insert({ name: 'Persisted User', age: 40 });
  }

  // Re-initialize to check persistence
  const db2 = new ToonDB(DB_FILE, { user: userSchema });
  const users = db2.table('user').all();
  expect(users.length).toBe(1);
  expect(users[0].name).toBe('Persisted User');
});

test('9. Indexing: findBy should work for indexed fields', () => {
  cleanup();
  const db = new ToonDB(DB_FILE, { user: userSchema });
  db.createIndex('user', 'name');
  db.table('user').insert({ name: 'Indexed Name', age: 20 });

  const result = db.table('user').findBy('name', 'Indexed Name').first();
  expect(result?.name).toBe('Indexed Name');
});

test('10. Optimization: where() should use index for equality checks', () => {
  cleanup();
  const db = new ToonDB(DB_FILE, { user: userSchema });
  db.createIndex('user', 'name');
  db.table('user').insert({ name: 'Optimized', age: 22 });

  // This should trigger the regex optimizer in Query.ts
  const result = db
    .table('user')
    .where((u) => u.name === 'Optimized')
    .first();
  expect(result?.name).toBe('Optimized');
});
