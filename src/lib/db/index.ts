import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Create a SQL connection using the Neon serverless driver
const sql = neon(process.env.DATABASE_URL!);

// Create the Drizzle ORM instance with our schema
export const db = drizzle(sql, { schema });

// Re-export all schema tables for convenience
export * from "./schema";
