import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { RuleSeverity, RuleType } from '@literaryhelper/types';

/**
 * Enums for database schema
 */
export const severityEnum = pgEnum('severity', ['info', 'warning', 'error']);
export const ruleTypeEnum = pgEnum('rule_type', ['simple', 'ai']);
export const analysisStatusEnum = pgEnum('analysis_status', ['pending', 'processing', 'completed', 'error']);

/**
 * Rules table - stores rule definitions
 */
export const rules = pgTable('rules', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  type: ruleTypeEnum('type').notNull(),
  severity: severityEnum('severity').notNull(),
  pattern: text('pattern'),
  promptTemplate: text('prompt_template'),
  model: varchar('model', { length: 50 }),
  provider: varchar('provider', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Users table - stores user information
 */
export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  name: varchar('name', { length: 100 }),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Analyses table - stores analysis results
 */
export const analyses = pgTable('analyses', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 128 }),
  text: text('text').notNull(),
  textHash: varchar('text_hash', { length: 64 }).notNull().index(),
  status: analysisStatusEnum('status').default('pending').notNull(),
  progress: integer('progress').default(0),
  results: jsonb('results').default('[]'),
  error: text('error'),
  processingTimeMs: integer('processing_time_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Analysis rule results - stores individual rule results for each analysis
 */
export const analysisRuleResults = pgTable('analysis_rule_results', {
  id: serial('id').primaryKey(),
  analysisId: integer('analysis_id').references(() => analyses.id, { onDelete: 'cascade' }).notNull(),
  ruleId: varchar('rule_id', { length: 64 }).references(() => rules.id, { onDelete: 'cascade' }).notNull(),
  matches: jsonb('matches').default('[]'),
  processingTimeMs: integer('processing_time_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Feedback table - stores user feedback on rule results
 */
export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'set null' }),
  analysisId: integer('analysis_id').references(() => analyses.id, { onDelete: 'cascade' }).notNull(),
  ruleId: varchar('rule_id', { length: 64 }).references(() => rules.id, { onDelete: 'cascade' }).notNull(),
  matchId: varchar('match_id', { length: 64 }),
  helpful: boolean('helpful').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Define relationships between tables
 */
export const rulesRelations = relations(rules, ({ many }) => ({
  analysisResults: many(analysisRuleResults),
  feedback: many(feedback),
}));

export const usersRelations = relations(users, ({ many }) => ({
  analyses: many(analyses),
  feedback: many(feedback),
}));

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id],
  }),
  ruleResults: many(analysisRuleResults),
  feedback: many(feedback),
}));

export const analysisRuleResultsRelations = relations(analysisRuleResults, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisRuleResults.analysisId],
    references: [analyses.id],
  }),
  rule: one(rules, {
    fields: [analysisRuleResults.ruleId],
    references: [rules.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
  analysis: one(analyses, {
    fields: [feedback.analysisId],
    references: [analyses.id],
  }),
  rule: one(rules, {
    fields: [feedback.ruleId],
    references: [rules.id],
  }),
}));
