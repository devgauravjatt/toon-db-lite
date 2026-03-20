import type { z } from 'zod';

export type SchemaMap = Record<string, z.ZodObject<any>>;

export type InferTables<T extends SchemaMap> = {
  [K in keyof T]: (z.infer<T[K]> & { id: string })[];
};

export type TableItem<T extends SchemaMap, K extends keyof T> = z.infer<T[K]> & {
  id: string;
};

export type IndexStore = {
  [table: string]: {
    [field: string]: Map<any, any[]>;
  };
};
