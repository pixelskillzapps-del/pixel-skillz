/* =====================================================================
   session-store.js — session Node ke apne SQLite me rakhta hai.
   Isse koi bahar wali library nahi chahiye (na compile, na Python).
   ===================================================================== */
const session = require('express-session');
const { DatabaseSync } = require('node:sqlite');

class SqliteSessionStore extends session.Store {
  constructor(file, ttlMs = 8 * 3600 * 1000) {
    super();
    this.ttl = ttlMs;
    this.db = new DatabaseSync(file);
    this.db.exec(`CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL)`);
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_sess_exp ON sessions(expires)');
    this.q = {
      get: this.db.prepare('SELECT data, expires FROM sessions WHERE sid = ?'),
      set: this.db.prepare(`INSERT INTO sessions (sid,data,expires) VALUES (?,?,?)
                            ON CONFLICT(sid) DO UPDATE SET data=excluded.data, expires=excluded.expires`),
      del: this.db.prepare('DELETE FROM sessions WHERE sid = ?'),
      clean: this.db.prepare('DELETE FROM sessions WHERE expires < ?'),
      touch: this.db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?'),
    };
    // har 15 minute me purane session hata do
    this.timer = setInterval(() => {
      try { this.q.clean.run(Date.now()); } catch (_) {}
    }, 15 * 60 * 1000);
    this.timer.unref?.();
  }

  _exp(sess) {
    const ms = sess?.cookie?.maxAge ?? this.ttl;
    return Date.now() + ms;
  }

  get(sid, cb) {
    try {
      const row = this.q.get.get(sid);
      if (!row) return cb(null, null);
      if (row.expires < Date.now()) { this.q.del.run(sid); return cb(null, null); }
      cb(null, JSON.parse(row.data));
    } catch (e) { cb(e); }
  }

  set(sid, sess, cb) {
    try { this.q.set.run(sid, JSON.stringify(sess), this._exp(sess)); cb(null); }
    catch (e) { cb(e); }
  }

  destroy(sid, cb) {
    try { this.q.del.run(sid); cb(null); } catch (e) { cb(e); }
  }

  touch(sid, sess, cb) {
    try { this.q.touch.run(this._exp(sess), sid); cb(null); } catch (e) { cb(e); }
  }
}

module.exports = SqliteSessionStore;
