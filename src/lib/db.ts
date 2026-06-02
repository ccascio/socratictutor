import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data', 'socratic.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS learner_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      depth_level TEXT NOT NULL DEFAULT 'intermediate',
      learning_style TEXT NOT NULL DEFAULT 'intuition-first',
      preferred_analogies TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS learning_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      topic TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      current_level TEXT NOT NULL DEFAULT 'intermediate',
      target_depth TEXT NOT NULL DEFAULT 'conceptual',
      motivation TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      mastery_percent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_session_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES learning_goals(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      topic TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 0,
      turn_count INTEGER NOT NULL DEFAULT 0,
      artifact_id TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      role TEXT NOT NULL CHECK(role IN ('tutor','user','system')),
      content TEXT NOT NULL,
      turn_index INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, turn_index);

    CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      goal_id TEXT NOT NULL REFERENCES learning_goals(id),
      name TEXT NOT NULL,
      simple_definition TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'unknown',
      prerequisites TEXT NOT NULL DEFAULT '[]',
      session_count INTEGER NOT NULL DEFAULT 0,
      misconception_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed TEXT,
      user_notes TEXT NOT NULL DEFAULT '',
      UNIQUE(user_id, goal_id, name)
    );

    CREATE TABLE IF NOT EXISTS misconceptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      concept_id TEXT REFERENCES concepts(id),
      concept_name TEXT NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      goal_topic TEXT NOT NULL,
      text TEXT NOT NULL,
      correction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unresolved',
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS learning_artifacts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      goal_topic TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      mastered TEXT NOT NULL DEFAULT '[]',
      weak TEXT NOT NULL DEFAULT '[]',
      next_questions TEXT NOT NULL DEFAULT '[]',
      flashcards TEXT NOT NULL DEFAULT '[]',
      quiz_questions TEXT NOT NULL DEFAULT '[]',
      suggested_next TEXT NOT NULL DEFAULT '',
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS review_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      source_type TEXT NOT NULL CHECK(source_type IN ('misconception','concept','flashcard')),
      source_id TEXT NOT NULL,
      label TEXT NOT NULL,
      goal_topic TEXT NOT NULL,
      due_at TEXT NOT NULL,
      interval_days INTEGER NOT NULL DEFAULT 1,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      last_reviewed TEXT
    );

    CREATE TABLE IF NOT EXISTS concept_embeddings (
      concept_id TEXT PRIMARY KEY REFERENCES concepts(id),
      embedding BLOB NOT NULL,
      model TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_embeddings (
      message_id TEXT PRIMARY KEY REFERENCES messages(id),
      embedding BLOB NOT NULL,
      model TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export { getDb };
