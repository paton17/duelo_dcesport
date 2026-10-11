'use strict';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const crypto = require('crypto');

const prod = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
if (prod && (!process.env.DATABASE_URL || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !process.env.OWNER_PASSWORD || process.env.OWNER_PASSWORD.length < 10 || process.env.OWNER_PASSWORD.startsWith('CAMBIA_') || process.env.SESSION_SECRET.startsWith('CAMBIA_'))) {
  console.error('ERROR: Railway requiere DATABASE_URL, SESSION_SECRET (32+ caracteres) y OWNER_PASSWORD (10+ caracteres).');
  process.exit(1);
}
const SESSION_SECRET = process.env.SESSION_SECRET || 'local-development-secret-never-use-in-production-2026';
const OWNER_USERNAME = (process.env.OWNER_USERNAME || 'Caleb').trim().toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Demo12345!';
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 8, connectionTimeoutMillis: 15000 }) : null;
const localDB = pool ? null : new PGlite(path.join(__dirname, '.local-data'));
const db = { query: (sql, params = []) => pool ? pool.query(sql, params) : localDB.query(sql, params) };
async function transaction(work) {
  if (pool) {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await work((sql, params = []) => client.query(sql, params)); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  return localDB.transaction(async tx => work((sql, params = []) => tx.query(sql, params)));
}
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cookieParser());
app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: prod ? '1h' : 0, index: 'index.html', setHeaders(res,file) { if(file.endsWith('.html')) res.setHeader('Cache-Control','no-cache'); } }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ error: 'Origen de solicitud no permitido.' });
  }
  next();
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const err = (message, status = 400) => { const e = new Error(message); e.status = status; throw e; };
const nonEmpty = (v, label, max = 70) => { if (typeof v !== 'string' || !v.trim() || v.trim().length > max) err(`${label}: escribe entre 1 y ${max} caracteres.`); return v.trim(); };
const integer = (v, min, max, label = 'Número') => { const n = Number(v); if (!Number.isInteger(n) || n < min || n > max) err(`${label} debe estar entre ${min} y ${max}.`); return n; };
const validColor = v => /^#[0-9a-fA-F]{6}$/.test(v || '');
const cleanUrl = (v) => { const str = (v || '').trim(); if (!str) return ''; try { const u = new URL(str); if (!['http:', 'https:'].includes(u.protocol)) err('Solo se admiten direcciones http/https.'); return str.slice(0, 1000); } catch { err('Dirección URL no válida.'); } };
const nick = v => { const input = nonEmpty(v, 'Nombre del jugador', 26).replace(/^DC[.\s_-]*/i, '').trim().replace(/\s+/g, ' '); if (!input || input.length > 23) err('Ingresa un nombre válido (máximo 23 caracteres sin DC.).'); return 'DC.' + input; };
const tokenCookie = { httpOnly: true, sameSite: 'lax', secure: prod, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };
async function userFromRequest(req) {
  const token = req.cookies.dc_access;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'] });
    const { rows } = await db.query('SELECT id, username, role, team_id, auth_version FROM users WHERE id=$1', [payload.id]);
    if (!rows.length || rows[0].auth_version !== payload.version) return null;
    return rows[0];
  } catch { return null; }
}
app.use('/api', wrap(async (req, res, next) => { req.user = await userFromRequest(req); next(); }));
const requireUser = (req, _res, next) => req.user ? next() : next(Object.assign(new Error('Debes iniciar sesión.'), { status: 401 }));
const requireOwner = (req, res, next) => requireUser(req, res, e => e ? next(e) : req.user.role === 'owner' ? next() : next(Object.assign(new Error('Solo el jefe puede hacer esto.'), { status: 403 })));
const requireAdmin = (req, res, next) => requireUser(req, res, e => e ? next(e) : ['owner','admin'].includes(req.user.role) ? next() : next(Object.assign(new Error('Necesitas permisos administrativos.'), { status: 403 })));
function editableTeam(req, teamId) { if (!req.user) err('Inicia sesión.', 401); if (req.user.role !== 'owner' && Number(req.user.team_id) !== Number(teamId)) err('No puedes editar otro equipo.', 403); }
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muchos intentos. Inténtalo más tarde.' } });

async function initialize() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id=1), title TEXT NOT NULL DEFAULT 'DC DUEL LEAGUE',
      subtitle TEXT NOT NULL DEFAULT 'EL DOMINIO SE DEMUESTRA RONDA A RONDA',
      season TEXT NOT NULL DEFAULT 'TEMPORADA 2026', mode INTEGER NOT NULL DEFAULT 4 CHECK (mode IN (4,6)),
      max_teams INTEGER NOT NULL DEFAULT 0 CHECK (max_teams >= 0),
      jornadas INTEGER NOT NULL DEFAULT 1 CHECK (jornadas IN (1,2)),
      accent TEXT NOT NULL DEFAULT '#eb3da9',
      background_id INTEGER, music_id INTEGER, site_logo_id INTEGER, background_url TEXT NOT NULL DEFAULT '', music_url TEXT NOT NULL DEFAULT '',
      announcement TEXT NOT NULL DEFAULT 'La arena está lista. Que gane el mejor escuadrón.',
      prize TEXT NOT NULL DEFAULT 'LA GLORIA ES NUESTRA', status TEXT NOT NULL DEFAULT 'EN COMPETENCIA',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY, name VARCHAR(70) NOT NULL UNIQUE, color VARCHAR(7) NOT NULL DEFAULT '#eb3da9',
      logo_id INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      role VARCHAR(10) NOT NULL CHECK(role IN ('owner','admin','team')),
      team_id INTEGER UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
      auth_version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY, team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      slot INTEGER NOT NULL CHECK(slot >= 1), nickname VARCHAR(26) NOT NULL,
      photo_id INTEGER, UNIQUE(team_id,slot)
    )`,
    `CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY, home_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      away_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      round_no INTEGER NOT NULL DEFAULT 1,
      score_home INTEGER, score_away INTEGER,
      status VARCHAR(12) NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','finished')),
      played_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK(home_id<>away_id), CHECK(score_home IS NULL OR score_home BETWEEN 0 AND 99),
      CHECK(score_away IS NULL OR score_away BETWEEN 0 AND 99)
    )`,
    `CREATE TABLE IF NOT EXISTS kills (
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      count INTEGER NOT NULL CHECK(count BETWEEN 0 AND 999),
      PRIMARY KEY(match_id,player_id)
    )`,
    `CREATE TABLE IF NOT EXISTS match_lineups (
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      PRIMARY KEY(match_id,player_id)
    )`,
    `CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY, mime VARCHAR(60) NOT NULL, data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `INSERT INTO settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING`
  ];
  for (const sql of queries) await db.query(sql);
  // Migración sin borrar datos para las bases existentes (PC y Railway).
  await db.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS site_logo_id INTEGER');
  await db.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS jornadas INTEGER NOT NULL DEFAULT 1');
  // Esquema anterior: 3/4 equipos y seis jugadores fijos.
  await db.query('ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_max_teams_check');
  await db.query('ALTER TABLE players DROP CONSTRAINT IF EXISTS players_slot_check');
  await db.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  await db.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('owner','admin','team'))");
  // Migra participantes históricos sin afectar las kills existentes.
  await db.query('INSERT INTO match_lineups(match_id,player_id,team_id) SELECT DISTINCT k.match_id,k.player_id,p.team_id FROM kills k JOIN players p ON p.id=k.player_id ON CONFLICT DO NOTHING');
  const owner = await db.query("SELECT id FROM users WHERE role='owner' LIMIT 1");
  if (!owner.rows.length) {
    await db.query('INSERT INTO users(username,password_hash,role) VALUES($1,$2,$3)', [OWNER_USERNAME, await bcrypt.hash(OWNER_PASSWORD, 11), 'owner']);
    console.log(`Cuenta del jefe creada: ${OWNER_USERNAME} (contraseña definida en el entorno).`);
  }
  if (!prod && process.env.SEED_DEMO === '1') await seedDemo();
}
async function seedDemo() {
  const found = await db.query('SELECT COUNT(*)::int AS count FROM teams');
  if (found.rows[0].count) return;
  const samples = [
    ['DC ESPORT RED', '#ff477e', ['MAXII', 'PATON', 'RENZO', 'ZEUS', 'FOX', 'GHOST']],
    ['DC ESPORT BLACK', '#9295ff', ['LORD', 'DARK', 'AXEL', 'SNIPER', 'KILLER', 'NOVA']],
    ['DC ESPORT WHITE', '#5adbd4', ['EVO', 'RAY', 'ELITE', 'DANTE', 'FLASH', 'RIDER']],
    ['DC ESPORT GOLD', '#f3b957', ['KING', 'RAFA', 'ACE', 'HADES', 'CRIS', 'ANGEL']]
  ];
  for (const [name, color, playerNames] of samples) {
    const t = await db.query('INSERT INTO teams(name,color) VALUES($1,$2) RETURNING id', [name, color]);
    for (let i = 0; i < playerNames.length; i++) await db.query('INSERT INTO players(team_id,slot,nickname) VALUES($1,$2,$3)', [t.rows[0].id, i + 1, 'DC.' + playerNames[i]]);
  }
  const all = await db.query('SELECT id FROM teams ORDER BY id');
  const ids = all.rows.map(r => r.id);
  const examples = [[ids[0],ids[1],7,5,1],[ids[2],ids[3],7,4,1],[ids[0],ids[2],6,7,2],[ids[1],ids[3],7,3,2]];
  for (const [home,away,a,b,r] of examples) {
    const m = await db.query("INSERT INTO matches(home_id,away_id,score_home,score_away,round_no,status,played_at) VALUES($1,$2,$3,$4,$5,'finished',CURRENT_TIMESTAMP) RETURNING id", [home,away,a,b,r]);
    const p = await db.query('SELECT id,team_id,slot FROM players WHERE team_id IN ($1,$2) AND slot<=4 ORDER BY team_id,slot',[home,away]);
    for (const x of p.rows) {
      await db.query('INSERT INTO kills(match_id,player_id,count) VALUES($1,$2,$3)', [m.rows[0].id,x.id, x.slot === 1 ? 8 : x.slot === 2 ? 6 : x.slot === 3 ? 4 : 2]);
      await db.query('INSERT INTO match_lineups(match_id,player_id,team_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[m.rows[0].id,x.id,x.team_id]);
    }
  }
  await db.query("UPDATE settings SET title='DC DUEL LEAGUE', announcement='4 escuadras. Una sola corona. Cada ronda cuenta.' WHERE id=1");
  console.log('Datos de demostración creados en local.');
}

async function getPublicData() {
  const [sr, tr, pr, mr, kr, lr] = await Promise.all([
    db.query('SELECT * FROM settings WHERE id=1'),
    db.query('SELECT * FROM teams ORDER BY id'),
    db.query('SELECT id,team_id,slot,nickname,photo_id FROM players ORDER BY team_id,slot'),
    db.query('SELECT * FROM matches ORDER BY round_no,id'),
    db.query('SELECT match_id,player_id,count FROM kills'),
    db.query('SELECT match_id,player_id,team_id FROM match_lineups')
  ]);
  const settings = sr.rows[0];
  const teams = tr.rows.map(x => ({ ...x, logo_url: x.logo_id ? `/media/${x.logo_id}` : null }));
  const players = pr.rows.map(x => ({ ...x, photo_url: x.photo_id ? `/media/${x.photo_id}` : null, kills: 0, matches_played: 0 }));
  const matches = mr.rows;
  const selectedLineups = new Map();
  for (const l of lr.rows) { if(!selectedLineups.has(Number(l.match_id))) selectedLineups.set(Number(l.match_id),[]); selectedLineups.get(Number(l.match_id)).push({player_id:l.player_id,team_id:l.team_id}); }
  const killLines = kr.rows;
  const playerById = new Map(players.map(p=>[Number(p.id),p]));
  const teamById = new Map(teams.map(t=>[Number(t.id),t]));
  const standings = teams.map(t=>({ team_id:t.id, name:t.name, logo_url:t.logo_url, color:t.color, played:0, wins:0, losses:0, points:0, rounds_for:0, rounds_against:0, diff:0, kills:0 }));
  const standingsMap = new Map(standings.map(s=>[Number(s.team_id),s]));
  const matchKillMap = new Map();
  const participation = new Set();
  for (const k of killLines) {
    const p = playerById.get(Number(k.player_id));
    const m = matches.find(x=>Number(x.id)===Number(k.match_id));
    if (!p || !m || m.status !== 'finished' || ![Number(m.home_id),Number(m.away_id)].includes(Number(p.team_id))) continue;
    p.kills += k.count;
    const s = standingsMap.get(Number(p.team_id));
    if (s) s.kills += k.count;
    const key = `${k.match_id}_${k.player_id}`;
    if (!participation.has(key)) { p.matches_played++; participation.add(key); }
    if (!matchKillMap.has(Number(k.match_id))) matchKillMap.set(Number(k.match_id), []);
    matchKillMap.get(Number(k.match_id)).push({ player_id:p.id, nickname:p.nickname, team_id:p.team_id, count:k.count });
  }
  for (const m of matches) {
    if (m.status !== 'finished') continue;
    const a = standingsMap.get(Number(m.home_id));
    const b = standingsMap.get(Number(m.away_id));
    if (!a || !b) continue;
    a.played++; b.played++;
    a.rounds_for += m.score_home; a.rounds_against += m.score_away;
    b.rounds_for += m.score_away; b.rounds_against += m.score_home;
    if (m.score_home > m.score_away) { a.wins++; b.losses++; a.points += 3; }
    else if (m.score_away > m.score_home) { b.wins++; a.losses++; b.points += 3; }
  }
  for (const s of standings) s.diff = s.rounds_for - s.rounds_against;
  standings.sort((a,b)=> b.points-a.points || b.diff-a.diff || b.rounds_for-a.rounds_for || b.kills-a.kills || a.name.localeCompare(b.name));
  const leaderboard = [...players].sort((a,b)=>b.kills-a.kills || a.nickname.localeCompare(b.nickname)).map((p,i)=>({...p, team_name:teamById.get(Number(p.team_id))?.name || '', team_color:teamById.get(Number(p.team_id))?.color || '#777', position:i+1}));
  return { settings: {
    ...settings,
    background: settings.background_id ? `/media/${settings.background_id}` : settings.background_url,
    music: settings.music_id ? `/media/${settings.music_id}` : settings.music_url,
    site_logo: settings.site_logo_id ? `/media/${settings.site_logo_id}` : null
  }, teams, players, matches: matches.map(m=>({...m, home_name:teamById.get(Number(m.home_id))?.name, away_name:teamById.get(Number(m.away_id))?.name, home_logo:teamById.get(Number(m.home_id))?.logo_url, away_logo:teamById.get(Number(m.away_id))?.logo_url, home_color:teamById.get(Number(m.home_id))?.color, away_color:teamById.get(Number(m.away_id))?.color, match_kills:matchKillMap.get(Number(m.id)) || [], lineup:selectedLineups.get(Number(m.id)) || []})), standings, leaderboard };
}
app.get('/health', wrap(async (_req, res) => { await db.query('SELECT 1'); res.json({ ok: true }); }));
app.get('/api/bootstrap', wrap(async (req,res)=>res.json({ ...(await getPublicData()), me: req.user && { id:req.user.id, username:req.user.username, role:req.user.role, team_id:req.user.team_id } }))); 
app.post('/api/login', loginLimiter, wrap(async (req,res)=>{
  const username = nonEmpty(req.body.username, 'Usuario', 50).toLowerCase();
  const password = String(req.body.password || '');
  const found = await db.query('SELECT * FROM users WHERE LOWER(username)=$1 LIMIT 1', [username]);
  const u = found.rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) err('Usuario o contraseña incorrectos.', 401);
  const token = jwt.sign({ id: u.id, version: u.auth_version }, SESSION_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
  res.cookie('dc_access', token, tokenCookie);
  res.json({ ok: true, username: u.username, role:u.role });
}));
app.post('/api/logout', wrap(async (_req,res)=>{res.clearCookie('dc_access',{ path:'/', sameSite:'lax', secure:prod }); res.json({ok:true});}));
app.post('/api/account/password', requireUser, wrap(async(req,res)=>{
  const old = String(req.body.current || ''); const fresh = String(req.body.password || '');
  if (fresh.length < 10 || fresh.length > 120) err('La nueva contraseña debe tener entre 10 y 120 caracteres.');
  const found = await db.query('SELECT password_hash FROM users WHERE id=$1',[req.user.id]);
  if (!await bcrypt.compare(old,found.rows[0].password_hash)) err('Contraseña actual incorrecta.',403);
  await db.query('UPDATE users SET password_hash=$1, auth_version=auth_version+1 WHERE id=$2',[await bcrypt.hash(fresh,11),req.user.id]);
  res.clearCookie('dc_access',{path:'/',sameSite:'lax',secure:prod}); res.json({ok:true});
}));

app.post('/api/account/username',requireOwner,wrap(async(req,res)=>{
  const username=nonEmpty(req.body.username,'Nuevo usuario',50).toLowerCase();
  if(!/^[a-z0-9._-]{4,50}$/.test(username))err('Usuario inválido: entre 4 y 50 caracteres, solo letras, números, punto, guion y guion bajo.');
  const current=String(req.body.current||'');
  const found=(await db.query('SELECT password_hash FROM users WHERE id=$1',[req.user.id])).rows[0];
  if(!await bcrypt.compare(current,found.password_hash))err('Contraseña actual incorrecta.',403);
  await db.query('UPDATE users SET username=$1,auth_version=auth_version+1 WHERE id=$2',[username,req.user.id]);
  res.clearCookie('dc_access',{path:'/',sameSite:'lax',secure:prod});
  res.json({ok:true});
}));
app.post('/api/admin/settings', requireOwner, wrap(async(req,res)=>{
  const s=req.body;
  const title = nonEmpty(s.title,'Nombre del torneo',70);
  const subtitle = nonEmpty(s.subtitle,'Eslogan',120);
  const season = nonEmpty(s.season,'Temporada',50);
  const mode = integer(s.mode,4,6,'Jugadores por equipo'); if (![4,6].includes(mode)) err('El modo debe ser 4vs4 o 6vs6.');
  const maxTeams = integer(s.max_teams,0,2147483647,'Cantidad de equipos (0 significa sin límite)');
  const jornadas = integer(s.jornadas ?? 1,1,2,'Número de jornadas');
  const cnt=await db.query('SELECT COUNT(*)::int AS n FROM teams');
  if(maxTeams!==0 && cnt.rows[0].n > maxTeams) err('Elimina equipos antes de reducir el límite.');
  if (!validColor(s.accent)) err('Color no válido.');
  const announcement = nonEmpty(s.announcement,'Anuncio',250);
  const prize = nonEmpty(s.prize,'Premio o lema',70);
  const status = nonEmpty(s.status,'Estado',35);
  const background_url = cleanUrl(s.background_url), music_url = cleanUrl(s.music_url);
  const background_id = s.background_id === null || s.background_id === '' ? null : integer(s.background_id,1,1e10);
  const music_id = s.music_id === null || s.music_id === '' ? null : integer(s.music_id,1,1e10);
  const site_logo_id = s.site_logo_id === null || s.site_logo_id === '' || s.site_logo_id === undefined ? null : integer(s.site_logo_id,1,1e10);
  await db.query(`UPDATE settings SET title=$1,subtitle=$2,season=$3,mode=$4,max_teams=$5,accent=$6,
      announcement=$7,prize=$8,status=$9,background_url=$10,music_url=$11,background_id=$12,music_id=$13,site_logo_id=$14,jornadas=$15,updated_at=CURRENT_TIMESTAMP WHERE id=1`,
    [title,subtitle,season,mode,maxTeams,s.accent,announcement,prize,status,background_url,music_url,background_id,music_id,site_logo_id,jornadas]);
  res.json({ ok: true });
}));
app.post('/api/admin/teams', requireOwner, wrap(async(req,res)=>{
  const name = nonEmpty(req.body.name,'Nombre del equipo',70);
  const username = nonEmpty(req.body.username,'Usuario',50).toLowerCase();
  const password = String(req.body.password||'');
  if (!/^[a-z0-9._-]{4,50}$/.test(username)) err('El usuario debe tener 4-50 caracteres: letras, números, punto, guion o guion bajo.');
  if(password.length<10 || password.length>120) err('La contraseña del equipo debe tener 10 a 120 caracteres.');
  const color = req.body.color || '#eb3da9'; if(!validColor(color)) err('Color no válido.');
  const logoId = req.body.logo_id == null || req.body.logo_id === '' ? null : integer(req.body.logo_id,1,1e10);
  const max = await db.query('SELECT max_teams FROM settings WHERE id=1');
  const n = await db.query('SELECT COUNT(*)::int AS n FROM teams');
  if(max.rows[0].max_teams>0 && n.rows[0].n >= max.rows[0].max_teams) err('Ya alcanzaste el límite de equipos.');
  const r= await transaction(async q=>{
    const t=await q('INSERT INTO teams(name,color,logo_id) VALUES($1,$2,$3) RETURNING id',[name,color,logoId]);
    await q('INSERT INTO users(username,password_hash,role,team_id) VALUES($1,$2,$3,$4)',[username,await bcrypt.hash(password,11),'team',t.rows[0].id]);
    for(let slot=1;slot<=6;slot++) await q('INSERT INTO players(team_id,slot,nickname) VALUES($1,$2,$3)',[t.rows[0].id,slot,`DC.JUGADOR${slot}`]);
    return t.rows[0].id;
  });
  res.json({ok:true,id:r});
}));
app.patch('/api/admin/teams/:id',requireOwner,wrap(async(req,res)=>{
  const id=integer(req.params.id,1,1e10); const name=nonEmpty(req.body.name,'Equipo',70);
  const color=req.body.color; if(!validColor(color)) err('Color no válido.');
  const logo_id=req.body.logo_id === null || req.body.logo_id === '' ? null : integer(req.body.logo_id,1,1e10);
  const result=await db.query('UPDATE teams SET name=$1,color=$2,logo_id=$3 WHERE id=$4 RETURNING id',[name,color,logo_id,id]);
  if(!result.rows.length) err('Equipo no encontrado.',404);res.json({ok:true});
}));
// El capitán puede cambiar únicamente el logo de su propia escuadra.
// El jefe puede cambiar el de cualquier escuadra.
app.patch('/api/teams/:teamId/logo',requireUser,wrap(async(req,res)=>{
  const teamId=integer(req.params.teamId,1,1e10);
  editableTeam(req,teamId);
  const logoId=req.body.logo_id == null || req.body.logo_id === '' ? null : integer(req.body.logo_id,1,1e10);
  if (logoId) {
    const existing=await db.query('SELECT mime FROM assets WHERE id=$1',[logoId]);
    if (!existing.rows.length || !existing.rows[0].mime.startsWith('image/')) err('Logo no válido.',400);
  }
  const result=await db.query('UPDATE teams SET logo_id=$1 WHERE id=$2 RETURNING id',[logoId,teamId]);
  if (!result.rows.length) err('Equipo no encontrado.',404);
  res.json({ok:true});
}));
app.delete('/api/admin/teams/:id',requireOwner,wrap(async(req,res)=>{
  const id=integer(req.params.id,1,1e10);
  await db.query('DELETE FROM teams WHERE id=$1',[id]);res.json({ok:true});
}));
app.post('/api/admin/teams/:id/credentials',requireOwner,wrap(async(req,res)=>{
  const id=integer(req.params.id,1,1e10);
  const username=nonEmpty(req.body.username,'Usuario',50).toLowerCase(); const password=String(req.body.password||'');
  if(!/^[a-z0-9._-]{4,50}$/.test(username)) err('El usuario debe tener 4-50 caracteres alfanuméricos, punto o guion.');
  if(password.length<10 || password.length>120) err('La contraseña requiere mínimo 10 caracteres.');
  const r=await db.query("UPDATE users SET username=$1,password_hash=$2,auth_version=auth_version+1 WHERE team_id=$3 AND role='team' RETURNING id",[username,await bcrypt.hash(password,11),id]);
  if(!r.rows.length) err('Cuenta no encontrada.',404);res.json({ok:true});
}));
// El jefe autoriza auxiliares para administrar encuentros y alineaciones.
app.get('/api/admin/staff',requireOwner,wrap(async(_req,res)=>{
  const r=await db.query("SELECT id,username,created_at FROM users WHERE role='admin' ORDER BY id");
  res.json({admins:r.rows});
}));
app.post('/api/admin/staff',requireOwner,wrap(async(req,res)=>{
  const username=nonEmpty(req.body.username,'Usuario',50).toLowerCase();
  const password=String(req.body.password||'');
  if(!/^[a-z0-9._-]{4,50}$/.test(username))err('Usa entre 4 y 50 caracteres: letras, números, punto, guion o guion bajo.');
  if(password.length<10||password.length>120)err('La contraseña debe tener mínimo 10 caracteres.');
  const r=await db.query("INSERT INTO users(username,password_hash,role) VALUES($1,$2,'admin') RETURNING id",[username,await bcrypt.hash(password,11)]);
  res.json({ok:true,id:r.rows[0].id});
}));
app.delete('/api/admin/staff/:id',requireOwner,wrap(async(req,res)=>{
  const id=integer(req.params.id,1,2147483647);
  const r=await db.query("DELETE FROM users WHERE id=$1 AND role='admin' RETURNING id",[id]);
  if(!r.rows.length)err('Administrador no encontrado.',404);
  res.json({ok:true});
}));
app.get('/api/admin/accounts',requireOwner,wrap(async(_req,res)=>{
  const rows=await db.query("SELECT u.id,u.username,u.role,u.team_id,t.name AS team_name FROM users u LEFT JOIN teams t ON u.team_id=t.id WHERE u.role='team' ORDER BY t.name");
  res.json({accounts:rows.rows});
}));
app.patch('/api/teams/:teamId/players/:slot',requireUser,wrap(async(req,res)=>{
  const teamId=integer(req.params.teamId,1,1e10);
  const slot=integer(req.params.slot,1,2147483647);editableTeam(req,teamId);
  const nickname=nick(req.body.nickname);
  const photo_id=req.body.photo_id === null || req.body.photo_id === '' ? null : integer(req.body.photo_id,1,1e10);
  const r=await db.query('UPDATE players SET nickname=$1,photo_id=$2 WHERE team_id=$3 AND slot=$4 RETURNING id',[nickname,photo_id,teamId,slot]);
  if(!r.rows.length) err('Jugador no encontrado.',404);res.json({ok:true});
}));
// La plantilla tiene 6 titulares base y tantos suplentes como el equipo necesite.
app.post('/api/teams/:teamId/players',requireUser,wrap(async(req,res)=>{
  const teamId=integer(req.params.teamId,1,2147483647);
  editableTeam(req,teamId);
  const team=await db.query('SELECT id FROM teams WHERE id=$1',[teamId]);
  if(!team.rows.length) err('Equipo no encontrado.',404);
  const nickname=nick(req.body.nickname);
  const photo_id=req.body.photo_id == null || req.body.photo_id === '' ? null : integer(req.body.photo_id,1,2147483647);
  // Protección contra dos altas simultáneas que ocuparían el mismo puesto.
  const r=await transaction(async q=>{
    const max=await q('SELECT COALESCE(MAX(slot),0) AS n FROM players WHERE team_id=$1',[teamId]);
    const slot=Number(max.rows[0].n)+1;
    if(slot>2147483647)err('Se agotaron los identificadores de jugadores.');
    return q('INSERT INTO players(team_id,slot,nickname,photo_id) VALUES($1,$2,$3,$4) RETURNING id,slot',[teamId,slot,nickname,photo_id]);
  });
  res.json({ok:true,player:r.rows[0]});
}));
app.delete('/api/teams/:teamId/players/:id',requireUser,wrap(async(req,res)=>{
  const teamId=integer(req.params.teamId,1,2147483647),id=integer(req.params.id,1,2147483647);
  editableTeam(req,teamId);
  const p=await db.query('SELECT slot FROM players WHERE id=$1 AND team_id=$2',[id,teamId]);
  if(!p.rows.length)err('Jugador no encontrado.',404);
  if(p.rows[0].slot<=6)err('Los seis titulares base se conservan. Puedes editar sus nombres y fotografías.');
  const used=await db.query('SELECT 1 FROM match_lineups WHERE player_id=$1 LIMIT 1',[id]);
  const kills=await db.query('SELECT 1 FROM kills WHERE player_id=$1 LIMIT 1',[id]);
  if(used.rows.length||kills.rows.length)err('Este jugador tiene historial de partidas. No se puede eliminar sin borrar sus estadísticas.');
  await db.query('DELETE FROM players WHERE id=$1 AND team_id=$2',[id,teamId]);
  res.json({ok:true});
}));
// Cada enfrentamiento guarda exactamente su selección de jugadores.
async function validateLineup(match,body,q=db.query) {
  const mode=Number((await q('SELECT mode FROM settings WHERE id=1')).rows[0].mode);
  const sets=[['home_players',Number(match.home_id)],['away_players',Number(match.away_id)]];
  const combined=[];
  for(const [field,teamId] of sets){
    const ids=body[field];
    if(!Array.isArray(ids)||ids.length!==mode)err(`Selecciona exactamente ${mode} jugadores en cada equipo.`);
    if(new Set(ids.map(Number)).size!==mode)err('No repitas jugadores en una alineación.');
    const registered=await q('SELECT id FROM players WHERE team_id=$1',[teamId]);
    const allowed=new Set(registered.rows.map(x=>Number(x.id)));
    for(const item of ids){const id=integer(item,1,2147483647,'Jugador');if(!allowed.has(id))err('La alineación incluye un jugador que no pertenece al equipo.');combined.push({id,team_id:teamId});}
  }
  return combined;
}
async function persistLineup(q,matchId,selected){
  await q('DELETE FROM match_lineups WHERE match_id=$1',[matchId]);
  for(const p of selected)await q('INSERT INTO match_lineups(match_id,player_id,team_id) VALUES($1,$2,$3)',[matchId,p.id,p.team_id]);
}
app.post('/api/admin/matches/:id/lineup',requireAdmin,wrap(async(req,res)=>{
  const id=integer(req.params.id,1,2147483647);
  const m=(await db.query('SELECT home_id,away_id,status FROM matches WHERE id=$1',[id])).rows[0];
  if(!m)err('Encuentro no encontrado.',404);
  if(m.status==='finished')err('Para cambiar una alineación finalizada, vuelve a publicar el resultado con sus kills o reinicia el partido.');
  const selected=await validateLineup(m,req.body);
  await transaction(async q=>persistLineup(q,id,selected));
  res.json({ok:true});
}));
app.post('/api/admin/fixtures',requireAdmin,wrap(async(_req,res)=>{
  const all=(await db.query('SELECT id FROM teams ORDER BY id')).rows.map(t=>t.id);
  if(all.length<2)err('Primero crea al menos 2 equipos.');
  const jornadas=Number((await db.query('SELECT jornadas FROM settings WHERE id=1')).rows[0].jornadas);
  // Jornada 1: ida; jornada 2: vuelta con localía invertida.
  let created=0;
  await transaction(async q=>{
    const existing=(await q('SELECT home_id,away_id,round_no FROM matches WHERE round_no IN (1,2)')).rows;
    const keys=new Set(existing.map(m=>`${m.round_no}:${Math.min(m.home_id,m.away_id)}:${Math.max(m.home_id,m.away_id)}`));
    for(let phase=1;phase<=jornadas;phase++)for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
      const key=`${phase}:${Math.min(all[i],all[j])}:${Math.max(all[i],all[j])}`;
      if(keys.has(key))continue;
      const home=phase===1?all[i]:all[j],away=phase===1?all[j]:all[i];
      await q('INSERT INTO matches(home_id,away_id,round_no) VALUES($1,$2,$3)',[home,away,phase]);
      keys.add(key);created++;
    }
  });
  res.json({ok:true,created,jornadas});
}));
app.post('/api/admin/matches',requireAdmin,wrap(async(req,res)=>{
  const home=integer(req.body.home_id,1,1e10),away=integer(req.body.away_id,1,1e10);
  if(home===away) err('Selecciona equipos diferentes.');
  const round=integer(req.body.round_no||1,1,2,'Jornada');
  const jornada=(await db.query('SELECT jornadas FROM settings WHERE id=1')).rows[0].jornadas;
  if(round>jornada)err('Activa la segunda jornada desde Personalización antes de crear la vuelta.');
  const r=await db.query('INSERT INTO matches(home_id,away_id,round_no) VALUES($1,$2,$3) RETURNING id',[home,away,round]);
  res.json({ok:true,id:r.rows[0].id});
}));
app.post('/api/admin/matches/:id/result',requireAdmin,wrap(async(req,res)=>{
  const id=integer(req.params.id,1,2147483647);
  const a=integer(req.body.score_home,0,99,'Rondas del local');
  const b=integer(req.body.score_away,0,99,'Rondas del visitante');
  if(a===b)err('El marcador no puede empatar.');
  if(!Array.isArray(req.body.kills))err('Falta la tabla de kills.');
  const m=(await db.query('SELECT home_id,away_id FROM matches WHERE id=$1',[id])).rows[0];
  if(!m)err('Encuentro no encontrado.',404);
  const selected=await validateLineup(m,req.body);
  const allowed=new Set(selected.map(p=>p.id));
  if(req.body.kills.length!==allowed.size)err('Indica las kills de todos los jugadores seleccionados, incluso si son 0.');
  const seen=new Set();
  const updates=req.body.kills.map(k=>{
    const pid=integer(k.player_id,1,2147483647,'Jugador'),count=integer(k.count,0,999,'Kills');
    if(!allowed.has(pid)||seen.has(pid))err('Kills duplicadas o pertenecientes a jugadores no alineados.');
    seen.add(pid);return{pid,count};
  });
  await transaction(async q=>{
    await persistLineup(q,id,selected);
    await q("UPDATE matches SET score_home=$1,score_away=$2,status='finished',played_at=CURRENT_TIMESTAMP WHERE id=$3",[a,b,id]);
    await q('DELETE FROM kills WHERE match_id=$1',[id]);
    for(const k of updates)await q('INSERT INTO kills(match_id,player_id,count) VALUES($1,$2,$3)',[id,k.pid,k.count]);
  });
  res.json({ok:true});
}));
app.post('/api/admin/matches/:id/reset',requireAdmin,wrap(async(req,res)=>{
  const id=integer(req.params.id,1,1e10);
  await transaction(async q=>{await q('DELETE FROM kills WHERE match_id=$1',[id]);await q("UPDATE matches SET score_home=NULL,score_away=NULL,status='scheduled',played_at=NULL WHERE id=$1",[id]);});
  res.json({ok:true});
}));
app.delete('/api/admin/matches/:id',requireAdmin,wrap(async(req,res)=>{
  await db.query('DELETE FROM matches WHERE id=$1',[integer(req.params.id,1,1e10)]);res.json({ok:true});
}));
app.post('/api/media',requireUser,upload.single('file'),wrap(async(req,res)=>{
  if(!req.file) err('Selecciona un archivo.');
  const kind=String(req.body.kind || '');
  if(!['photo','logo','background','music'].includes(kind)) err('Tipo de archivo inválido.');
  if(['background','music'].includes(kind) && req.user.role!=='owner') err('Solo el jefe puede subir fondos y música.',403);
  if(kind==='logo' && req.user.role!=='owner') {
    const id=integer(req.body.team_id,1,1e10);
    editableTeam(req,id);
  }
  if(kind==='photo' && req.user.role!=='owner') {
    const id=integer(req.body.team_id,1,1e10);
    editableTeam(req,id);
  }
  const mime=req.file.mimetype;
  const accepted={photo:['image/png','image/jpeg','image/webp'],logo:['image/png','image/jpeg','image/webp'],background:['image/png','image/jpeg','image/webp'],music:['audio/mpeg','audio/mp3','audio/x-mpeg','audio/ogg','audio/wav','audio/wave','audio/x-wav','audio/x-pn-wav','audio/mp4','audio/x-m4a']};
  if(!accepted[kind].includes(mime)) err('Formato no admitido. Usa PNG/JPG/WEBP para imágenes o MP3/OGG/WAV para música.');
  const buf=req.file.buffer;
  const png=buf.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  const jpg=buf[0]===0xff && buf[1]===0xd8 && buf[2]===0xff;
  const webp=buf.toString('ascii',0,4)==='RIFF' && buf.toString('ascii',8,12)==='WEBP';
  if(kind!=='music' && !(png||jpg||webp)) err('El archivo no parece una imagen válida.');
  if(kind!=='music' && buf.length>3*1024*1024) err('La imagen debe pesar menos de 3 MB.');
  if(kind==='music' && buf.length>9*1024*1024) err('El audio debe pesar menos de 9 MB.');
  if(kind==='music') {
    const mp3=buf.toString('ascii',0,3)==='ID3' || (buf[0]===0xff && (buf[1]&0xe0)===0xe0);
    const ogg=buf.toString('ascii',0,4)==='OggS';
    const wav=buf.toString('ascii',0,4)==='RIFF' && buf.toString('ascii',8,12)==='WAVE';
    const mp4=buf.toString('ascii',4,8)==='ftyp';
    if(!(mp3||ogg||wav||mp4)) err('El audio no parece un MP3, OGG, WAV o M4A válido.');
  }
  const r=await db.query("INSERT INTO assets(mime,data) VALUES($1,decode($2,'base64')) RETURNING id",[mime,buf.toString('base64')]);
  res.json({ok:true,id:r.rows[0].id,url:`/media/${r.rows[0].id}`});
}));
app.get('/media/:id',wrap(async(req,res)=>{
  const id=integer(req.params.id,1,1e10);
  const r=await db.query('SELECT mime,data FROM assets WHERE id=$1',[id]);
  if(!r.rows.length) return res.status(404).send('Archivo no encontrado');
  const a=r.rows[0];
  const bytes=Buffer.from(a.data);
  res.set('X-Content-Type-Options','nosniff');
  res.set('Cache-Control','public, max-age=31536000, immutable');
  res.set('Accept-Ranges','bytes');
  res.type(a.mime);
  // Facilita reproducción y búsqueda en audio en navegadores con peticiones Range.
  const range=req.headers.range;
  if(range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!match) return res.status(416).set('Content-Range',`bytes */${bytes.length}`).end();
    const endRequested=match[2]?Number(match[2]):null;
    let start=match[1]?Number(match[1]):null;
    let end=endRequested;
    if(start===null && end!==null){start=Math.max(0,bytes.length-end);end=bytes.length-1;}
    else {start=start??0;end=end??bytes.length-1;}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length)
      return res.status(416).set('Content-Range',`bytes */${bytes.length}`).end();
    end=Math.min(end,bytes.length-1);
    res.status(206).set('Content-Range',`bytes ${start}-${end}/${bytes.length}`);
    res.set('Content-Length',String(end-start+1));
    return res.end(bytes.subarray(start,end+1));
  }
  res.set('Content-Length',String(bytes.length));
  res.end(bytes);
}));
app.use('/api',(req,res)=>res.status(404).json({error:'Ruta no encontrada.'}));
app.use((error,req,res,_next)=>{
  if(error.code==='LIMIT_FILE_SIZE') return res.status(413).json({error:'Archivo demasiado grande. Máximo 10 MB.'});
  if(error.code==='23505') return res.status(409).json({error:'Ya existe un equipo o usuario con ese nombre.'});
  if(error.code==='23503') return res.status(400).json({error:'El equipo o jugador indicado no existe.'});
  if(error.code==='23514') return res.status(400).json({error:'Los datos no cumplen las reglas del torneo.'});
  if(!error.status || error.status>=500) console.error(error);
  if(req.path.startsWith('/api')) return res.status(error.status||500).json({error:error.status ? error.message : 'Error interno del servidor.'});
  res.status(error.status||500).send(error.status ? error.message : 'Error interno.');
});
initialize().then(()=>{
  const port=Number(process.env.PORT||3000);
  app.listen(port,'0.0.0.0',()=>console.log(`DC DUEL LEAGUE lista en http://localhost:${port} (${pool?'PostgreSQL':'PGlite local'})`));
}).catch(e=>{ console.error('No se pudo iniciar la base de datos:',e);process.exit(1); });
