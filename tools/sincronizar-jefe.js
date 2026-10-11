"use strict";
require('dotenv').config();
const bcrypt=require('bcryptjs');
const path=require('path');
const {Pool}=require('pg');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
  const username=String(process.env.OWNER_USERNAME||'').trim().toLowerCase();
  const password=String(process.env.OWNER_PASSWORD||'');
  if(!/^[a-z0-9._-]{4,50}$/.test(username))throw Error('Configura OWNER_USERNAME en .env (4-50 caracteres).');
  if(password.length<10||password.length>120||password.startsWith('CAMBIA_'))throw Error('Configura OWNER_PASSWORD en .env (contraseña real de 10-120 caracteres).');
  const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL}):null;
  const local=pool?null:new PGlite(path.join(__dirname,'..','.local-data'));
  const query=(sql,args=[])=>pool?pool.query(sql,args):local.query(sql,args);
  try{
    const table=await query("SELECT to_regclass('public.users') AS name");
    if(!table.rows[0].name)throw Error('Primero inicia la página con npm.cmd start para crear la base de datos.');
    const owner=(await query("SELECT id FROM users WHERE role='owner' LIMIT 1")).rows[0];
    const hash=await bcrypt.hash(password,11);
    if(owner){await query("UPDATE users SET username=$1,password_hash=$2,auth_version=auth_version+1 WHERE id=$3",[username,hash,owner.id]);}
    else{await query("INSERT INTO users(username,password_hash,role) VALUES($1,$2,'owner')",[username,hash]);}
    console.log('Cuenta del jefe actualizada. Usuario:',username,'| Se cerraron las sesiones anteriores.');
  }finally{if(pool)await pool.end();else await local.close();}
})().catch(e=>{console.error('ERROR:',e.message);process.exitCode=1;});
