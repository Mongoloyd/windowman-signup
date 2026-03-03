import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Leads table — captures every homeowner submission.
 * Status lifecycle: unverified → verified (or stays unverified as a partial lead).
 * The team SMS notification is only sent when status flips to 'verified'.
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  /** Homeowner's name from the qualification form */
  name: varchar("name", { length: 100 }).notNull(),
  /** E.164 phone number e.g. +15617827090 */
  phone: varchar("phone", { length: 20 }).notNull(),
  /** Twilio Lookup v2 line type: mobile, voip, landline, etc. */
  lineType: varchar("lineType", { length: 32 }),
  /** Verification status — unverified until OTP is approved */
  status: mysqlEnum("status", ["unverified", "verified", "blocked"]).default("unverified").notNull(),
  /** Source flow: flow_a (quote uploaded), flow_b (no quote), callback */
  source: mysqlEnum("source", ["flow_a", "flow_b", "callback"]).default("flow_b").notNull(),
  /** Qualification answers stored as JSON */
  answers: json("answers"),
  /** Timestamp when OTP was verified */
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
