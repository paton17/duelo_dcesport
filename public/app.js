/* DC DUEL LEAGUE — Interface: visitante, jefe y capitán */
const $ = (s,root=document) => root.querySelector(s);
const $$ = (s,root=document) => [...root.querySelectorAll(s)];
const state={data:null,view:'home',adminTab:'settings',rosterTeamId:null,busy:false};
const ICONS={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4ZM7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>',
  swords:'<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M11 5l2-2h4l4 4v4l-2 2M3 21l5-5M5 19l-2-2"/>',
  crosshair:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M20 12a8 8 0 0 0-.1-1.1l1.7-1.3-1.7-3-2.1.8A8 8 0 0 0 16 6.3L15.7 4h-3.4L12 6.3a8 8 0 0 0-1.8 1.1L8.1 6.6l-1.7 3 1.7 1.3a8 8 0 0 0 0 2.2l-1.7 1.3 1.7 3 2.1-.8a8 8 0 0 0 1.8 1.1l.3 2.3h3.4l.3-2.3a8 8 0 0 0 1.8-1.1l2.1.8 1.7-3-1.7-1.3A8 8 0 0 0 20 12Z" transform="translate(-1 -1)"/>',
  volume:'<path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
  mute:'<path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6M21 9l-5 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  logout:'<path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
  edit:'<path d="m15 5 4 4M3 21l4-.8L20 7a2.8 2.8 0 0 0-4-4L3 16z"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  shield:'<path d="M12 22s9-4 9-11V5l-9-3-9 3v6c0 7 9 11 9 11Z"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>',
  medal:'<circle cx="12" cy="14" r="6"/><path d="m8 3 4 5 4-5M5 3h4M15 3h4"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  flag:'<path d="M5 22V3m0 1c6-4 9 4 16 0v12c-7 4-10-4-16 0"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  play:'<path d="m8 5 11 7-11 7V5Z"/>',
  pause:'<path d="M8 5v14M16 5v14"/>'
};
function icon(name,extra=''){return `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.info}</svg>`}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(v){return Number(v||0).toLocaleString('es-PE');}
const data=()=>state.data;
const S=()=>data().settings;
const me=()=>data()?.me;
const isOwner=()=>me()?.role==='owner';
const isAdmin=()=>['owner','admin'].includes(me()?.role);
const canEditTeam=id=>isOwner()||(me()?.role==='team' && Number(me().team_id)===Number(id));
function badge(team,cls=''){const initials=team?.name?.replace(/^DC\s*/i,'').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'DC';return `<span class="team-badge ${cls}" style="--team-color:${esc(team?.color||'#eb3da9')}" aria-label="${esc(team?.name||'Equipo')}">${team?.logo_url?`<img src="${esc(team.logo_url)}" alt="" loading="lazy">`:esc(initials)}</span>`;}
function playerPic(player){return `<span class="player-pic">${player?.photo_url?`<img src="${esc(player.photo_url)}" alt="" loading="lazy">`:esc((player?.nickname||'DC').replace(/^DC\./,'').slice(0,2).toUpperCase())}</span>`;}
function teamById(id){return data().teams.find(t=>Number(t.id)===Number(id));}
function playersByTeam(id){return data().players.filter(p=>Number(p.team_id)===Number(id)).sort((a,b)=>a.slot-b.slot);}
function getVolume(){const saved=localStorage.getItem('dc-volume');if(saved===null)return .35;const v=Number(saved);return Number.isFinite(v)&&v>=0&&v<=1 ? v : .35;}
function musicButton(){const a=$('#site-audio'),playing=a&&!a.paused, muted=a?.muted||getVolume()===0, val=Math.round(getVolume()*100);
  return `<div class="audio-console" aria-label="Reproductor de música">
    <button class="icon-btn audio-play" data-action="music" type="button" title="${playing?'Pausar':'Reproducir'} música" aria-label="${playing?'Pausar':'Reproducir'} música">${icon(playing?'pause':'play')}</button>
    <button class="icon-btn audio-mute" data-action="mute" type="button" title="${muted?'Activar':'Silenciar'} sonido" aria-label="${muted?'Activar':'Silenciar'} sonido">${icon(muted?'mute':'volume')}</button>
    <input id="audio-volume" class="audio-range" type="range" min="0" max="100" step="1" value="${val}" aria-label="Volumen de la música" style="--level:${val}%">
    <span id="volume-level" class="audio-level">${val}%</span></div>`;
}
function syncAudioControls(){const a=$('#site-audio');if(!a)return;
  const play=$('.audio-play'),mute=$('.audio-mute'),slider=$('#audio-volume'),level=$('#volume-level');
  if(play){play.innerHTML=icon(a.paused?'play':'pause');play.title=a.paused?'Reproducir música':'Pausar música';play.setAttribute('aria-label',play.title);}
  if(mute){mute.innerHTML=icon(a.muted||a.volume===0?'mute':'volume');mute.title=a.muted?'Activar sonido':'Silenciar sonido';mute.setAttribute('aria-label',mute.title);}
  if(slider){slider.value=Math.round(a.volume*100);slider.style.setProperty('--level',slider.value+'%');}
  if(level)level.textContent=Math.round(a.volume*100)+'%';
}
async function api(path,method='GET',body){const options={method,credentials:'same-origin',headers:{}};if(body!==undefined){if(body instanceof FormData){options.body=body;}else{options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}}let res;try{res=await fetch('/api'+path,options);}catch{throw Error('No se puede conectar con el servidor. Revisa tu internet.');}let json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||`Error ${res.status}`);return json;}
async function refresh(renderNow=true){
  const result=await api('/bootstrap'),previousMusic=data()?.settings?.music;
  state.data=result;
  document.documentElement.style.setProperty('--pink',result.settings.accent);
  document.documentElement.style.setProperty('--hot',result.settings.accent);
  document.title=`${result.settings.title} • Arena competitiva`;
  const favicon=$('#site-favicon');
  if(favicon){if(result.settings.site_logo){favicon.href=result.settings.site_logo;favicon.disabled=false;}else{favicon.removeAttribute('href');}}
  const audio=$('#site-audio');
  if(previousMusic!==result.settings.music){
    const wasPlaying=!audio.paused;audio.pause();audio.src=result.settings.music||'';
    audio.volume=getVolume();audio.muted=localStorage.getItem('dc-muted')==='1';
    if(wasPlaying&&result.settings.music)audio.play().catch(()=>{});
  }
  if(renderNow)render();
}
function toast(message,error=false){const node=document.createElement('div');node.className='toast'+(error?' error':'');node.textContent=message;$('#toast-layer').append(node);setTimeout(()=>node.remove(),4500);}
function loadView(view){state.view=view;state.adminTab=view==='admin'&&!isOwner()?'matches':'settings';document.body.scrollTop=0;window.scrollTo({top:0,behavior:'instant'});render();}
function navButton(view,label,ic){return `<button class="nav-btn ${state.view===view?'active':''}" data-action="nav" data-view="${view}">${icon(ic)}<span class="nav-name">${label}</span>${view==='admin'&&isAdmin()?`<span class="side-pill">${isOwner()?'JEFE':'ADMIN'}</span>`:''}</button>`;}
function shell(content){const s=S();const nav=[['home','Inicio','home'],['standings','Clasificación','trophy'],['matches','Enfrentamientos','swords'],['kills','Ranking de kills','crosshair'],['teams','Escuadras','users'],['rules','Reglamento','shield']];if(isAdmin())nav.push(['admin',isOwner()?'Panel del jefe':'Panel administrador','settings']);if(me()?.role==='team')nav.push(['roster','Mi escuadra','users']);let curNav=nav.find(x=>x[0]===state.view)?.[1]||'Inicio';return `<div class="app-shell"><aside class="sidebar"><div class="brand-zone"><div class="brand-lockup"><div class="brand-icon ${s.site_logo?'brand-icon-image':''}">${s.site_logo?`<img src="${esc(s.site_logo)}" alt="Logo oficial de la liga">`:'<span>DC</span>'}</div><div class="brand-copy"><div class="brand-name">DUEL <em>LEAGUE</em></div><div class="brand-tag">COMPETITIVE ARENA</div></div></div></div><div class="sidebar-section"><div class="sidebar-label">NAVEGACIÓN</div>${nav.map(n=>navButton(...n)).join('')}</div><div class="side-bottom"><div class="season-card"><span class="label-small">TEMPORADA OFICIAL</span><strong>${esc(s.season)}</strong><p>Duelo de Escuadras<br>${s.mode} VS ${s.mode} • ${data().teams.length} EQUIPOS</p></div><div class="side-foot">© DC ESPORT · COMPETITIVE</div></div></aside><div class="main"><header class="topbar"><div class="breadcrumb">DC ESPORT ${icon('chevron')} <strong>${esc(curNav.toUpperCase())}</strong></div><div class="top-right"><div class="live-status"><span class="live-dot"></span>${esc(s.status.toUpperCase())}</div>${musicButton()}<button class="user-btn" data-action="${me()?'user-menu':'login'}"><span class="user-avatar">${me()?'★':'DC'}</span><span>${me()?esc(me().username):'ACCEDER'}</span></button></div></header><main class="page">${content}</main></div></div>`;}
function statCard(label,n,ic){return `<div class="stat-card"><div><div class="stat-label">${label}</div><div class="stat-number">${fmt(n)}</div></div><div class="stat-icon">${icon(ic)}</div></div>`;}
function pageHead(eyebrow,title,desc='',button=''){return `<header class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1><p class="page-desc">${desc}</p></div>${button}</header>`;}
function tableStandings(limit){const rows=data().standings.slice(0,limit||data().standings.length);if(!rows.length)return `<div class="empty">${icon('trophy')}La clasificación aparecerá cuando el jefe registre los equipos.</div>`;return `<div class="table-wrap"><table><thead><tr><th>POS</th><th>EQUIPO</th><th>PJ</th><th>PG</th><th>PP</th><th>RF</th><th>RC</th><th>DIF</th><th>PTS</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td><span class="rank ${i===0?'top':''}">${i+1}</span></td><td><span class="team-cell">${badge(teamById(r.team_id))}<span>${esc(r.name)}</span></span></td><td>${r.played}</td><td>${r.wins}</td><td>${r.losses}</td><td>${r.rounds_for}</td><td>${r.rounds_against}</td><td class="${r.diff>0?'pos-diff':r.diff<0?'neg-diff':''}">${r.diff>0?'+':''}${r.diff}</td><td class="pts">${r.points}</td></tr>`).join('')}</tbody></table></div>`;}
function miniMatch(m){const h=teamById(m.home_id),a=teamById(m.away_id);return `<div class="mini-match"><div class="mini-team">${badge(h)}<div class="mini-name">${esc(h?.name||'EQUIPO')}</div></div><div class="mini-score"><strong>${m.status==='finished'?`${m.score_home} : ${m.score_away}`:'VS'}</strong><small>${m.status==='finished'?'FINALIZADO':`JORNADA ${m.round_no}`}</small></div><div class="mini-team right">${badge(a)}<div class="mini-name">${esc(a?.name||'EQUIPO')}</div></div></div>`;}
function leaderItem(p,index){return `<div class="leader-item"><div class="leader-rank">${String(index+1).padStart(2,'0')}</div>${playerPic(p)}<div class="leader-info"><div class="leader-name">${esc(p.nickname)}</div><div class="leader-team">${esc(p.team_name)}</div></div><div class="kill-number">${p.kills}<small>KILLS</small></div></div>`;}
function home(){const s=S(), finished=data().matches.filter(m=>m.status==='finished');const totalKills=data().leaderboard.reduce((n,p)=>n+p.kills,0);const totalRounds=finished.reduce((n,m)=>n+m.score_home+m.score_away,0);const latest=[...data().matches].sort((a,b)=>b.id-a.id).slice(0,3);const top=data().leaderboard.slice(0,5);return `<section class="hero ${s.background?'has-bg':''}" ${s.background?`style="--hero-image:url('${esc(s.background).replace(/'/g,'%27')}')"`:''}><div class="hero-content"><div class="hero-tag">${icon('bolt')} ${esc(s.season.toUpperCase())} · ${s.mode}VS${s.mode}</div><h1 class="hero-h1">${esc(s.title.replace(/\s+(LEAGUE|LIGA)$/i,'')).toUpperCase()}<br><span>${/\bLEAGUE\b/i.test(s.title)?'LEAGUE':'ARENA'}</span></h1><p class="hero-sub">${esc(s.subtitle)}. ${esc(s.announcement)}</p><div class="hero-btns"><button class="btn btn-primary" data-action="nav" data-view="standings">VER CLASIFICACIÓN ${icon('arrow')}</button><button class="btn btn-ghost" data-action="nav" data-view="matches">${icon('swords')} ENFRENTAMIENTOS</button></div></div><div class="hero-right"><div class="hero-flare"></div><div class="hero-mark ${s.site_logo?'hero-mark-image':''}">${s.site_logo?`<img src="${esc(s.site_logo)}" alt="Logo del torneo">`:'DC'}</div></div><div class="hero-bottom-note">SURVIVE / COMPETE / DOMINATE</div></section><section class="stats-grid">${statCard('Equipos inscritos',data().teams.length,'users')}${statCard('Partidas jugadas',finished.length,'swords')}${statCard('Rondas disputadas',totalRounds,'refresh')}${statCard('Eliminaciones',totalKills,'crosshair')}</section><div class="content-grid"><section class="block"><div class="block-pad"><div class="section-head"><div><h2 class="section-title">TABLA DE <span class="text-pink">POSICIONES</span></h2><p class="section-caption">Clasificación oficial · 3 puntos por victoria</p></div><button class="btn-link" data-action="nav" data-view="standings">VER TODO →</button></div></div>${tableStandings(4)}</section><section class="block block-pad"><div class="section-head"><div><h2 class="section-title">ÚLTIMOS <span class="text-pink">DUELOS</span></h2><p class="section-caption">Resultados actualizados automáticamente</p></div>${icon('swords')}</div>${latest.length?latest.map(miniMatch).join(''):`<div class="empty">${icon('calendar')}Todavía no hay enfrentamientos registrados.</div>`}</section></div><div class="content-grid"><section class="block block-pad"><div class="section-head"><div><h2 class="section-title">TOP <span class="text-pink">FRAGGERS</span></h2><p class="section-caption">Los jugadores con más eliminaciones</p></div><button class="btn-link" data-action="nav" data-view="kills">RANKING →</button></div>${top.length?top.map(leaderItem).join(''):`<div class="empty">${icon('crosshair')}Los jugadores aparecerán aquí.</div>`}</section><section class="block block-pad"><div class="section-head"><div><h2 class="section-title">LA <span class="text-pink">COMPETENCIA</span></h2><p class="section-caption">Reglas esenciales de la arena</p></div></div><div class="rule-card" style="padding:16px;margin-bottom:11px"><div class="rule-number" style="font-size:31px">+03 PTS</div><h3 style="font-size:19px">CADA VICTORIA CUENTA</h3><p>La diferencia de rondas define los desempates.</p></div><div class="rule-card" style="padding:16px"><div class="rule-number" style="font-size:31px">${s.mode}V${s.mode}</div><h3 style="font-size:19px">DUELO DE ESCUADRAS</h3><p>${data().teams.length} equipos compiten por la cima.</p></div></section></div>`;}
function standings(){return `${pageHead('RANKING OFICIAL','TABLA DE <span class="text-pink">POSICIONES</span>','Orden: puntos → diferencia de rondas → rondas ganadas → kills.') }<section class="block full-panel">${tableStandings()}</section><div class="notice" style="margin-top:17px">${icon('info')} <strong>Sistema de puntos:</strong> victoria = 3 puntos; derrota = 0 puntos. DIF = rondas a favor (RF) menos rondas en contra (RC). PJ = partidas jugadas. Las tablas se actualizan al guardar un resultado.</div>`;}
function matchCard(m){const h=teamById(m.home_id),a=teamById(m.away_id),finished=m.status==='finished';const sum=(team)=>m.match_kills.filter(k=>Number(k.team_id)===Number(team)).reduce((n,k)=>n+k.count,0);return `<article class="match-card"><header class="match-meta"><span>${icon('calendar')} JORNADA ${m.round_no} · ${m.round_no===2?"VUELTA":"IDA"} · DUELO ${S().mode}V${S().mode}</span><span class="${finished?'status-finished':'status-pending'}">● ${finished?'FINALIZADO':'PENDIENTE'}</span></header><div class="match-duel"><div class="match-team">${badge(h)}<strong>${esc(h?.name||'EQUIPO')}</strong></div><div><div class="score-center ${finished?'':'placeholder'}"><span class="${finished&&m.score_home>m.score_away?'match-winner':''}">${finished?m.score_home:'—'}</span> : <span class="${finished&&m.score_away>m.score_home?'match-winner':''}">${finished?m.score_away:'—'}</span></div><div class="score-sub">${finished?'MARCADOR FINAL':'POR JUGAR'}</div></div><div class="match-team">${badge(a)}<strong>${esc(a?.name||'EQUIPO')}</strong></div></div><div class="match-footer"><span>${finished?`${icon('crosshair')} ${sum(m.home_id)} / ${sum(m.away_id)} KILLS POR EQUIPO`:'RESULTADO PENDIENTE DE REGISTRO'}</span><button data-action="match-lineup" data-id="${m.id}">${icon('users')} VER ALINEACIÓN</button>${isAdmin()?`<button data-action="edit-match" data-id="${m.id}">${icon('edit')} ${finished?'EDITAR RESULTADO':'REGISTRAR RESULTADO'} →</button>`:finished?`<button data-action="match-kills" data-id="${m.id}">VER KILLS →</button>`:''}</div></article>`;}
function matchesView(){const ms=[...data().matches].sort((a,b)=>a.round_no-b.round_no||a.id-b.id);return `${pageHead('ZONA DE COMBATE','ENFRENTA<span class="text-pink">MIENTOS</span>','Resultados por rondas y eliminaciones de cada enfrentamiento.',isAdmin()?`<button class="btn btn-primary" data-action="nav" data-view="admin">${icon('settings')} ADMINISTRAR</button>`:'')}<div class="matches-grid">${ms.length?ms.map(matchCard).join(''):`<div class="empty">${icon('swords')}Aún no hay partidos. El jefe puede generar el calendario automáticamente.</div>`}</div>`;}
function killsView(){const ps=data().leaderboard,top=ps.slice(0,3);const order=top.length===3?[top[1],top[0],top[2]]:top;return `${pageHead('PRECISIÓN LETAL','RANKING DE <span class="text-pink">KILLS</span>','Eliminaciones acumuladas de todos los jugadores registrados.')} ${top.length?`<div class="podium">${order.map(p=>`<div class="podium-card ${p.position===1?'first':''}">${playerPic(p)}<div class="podium-num">#${p.position}</div><div class="podium-name">${esc(p.nickname)}</div><div class="podium-team">${esc(p.team_name)}</div><div class="podium-kills">${fmt(p.kills)} <small>KILLS</small></div></div>`).join('')}</div>`:''}<section class="block"><div class="block-pad"><h2 class="section-title">CLASIFICACIÓN <span class="text-pink">INDIVIDUAL</span></h2><p class="section-caption">Las eliminaciones se suman al registrar cada partida.</p></div>${ps.length?`<div class="table-wrap"><table><thead><tr><th>#</th><th>JUGADOR</th><th>EQUIPO</th><th>PARTIDAS</th><th>KILLS</th><th>PROMEDIO</th></tr></thead><tbody>${ps.map((p,i)=>`<tr><td><span class="rank ${i===0?'top':''}">${i+1}</span></td><td><div class="team-cell">${playerPic(p)} ${esc(p.nickname)}</div></td><td>${esc(p.team_name)}</td><td>${p.matches_played}</td><td class="pts">${p.kills}</td><td>${p.matches_played?(p.kills/p.matches_played).toFixed(1):'0.0'}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${icon('crosshair')}Todavía no hay jugadores.</div>`}</section>`;}
function teamCard(team){const roster=playersByTeam(team.id).slice(0,6);const s=data().standings.find(x=>Number(x.team_id)===Number(team.id));return `<article class="team-card" style="--team-color:${esc(team.color)}"><div class="team-card-head">${badge(team)}<div><h3>${esc(team.name)}</h3><small>ESCUADRA OFICIAL · ${s?.points||0} PUNTOS</small></div></div><hr><div class="roster-mini">${roster.map(p=>`<div class="roster-slot">${playerPic(p)}<div title="${esc(p.nickname)}">${esc(p.nickname)}</div></div>`).join('')}</div><div class="team-card-bottom"><span class="tag">6 TITULARES · ${Math.max(0,playersByTeam(team.id).length-6)} SUPLENTES</span><button class="btn btn-ghost btn-sm" data-action="team-details" data-id="${team.id}">VER EQUIPO ${icon('arrow')}</button></div></article>`;}
function teamsView(){return `${pageHead('LOS CONTENDIENTES','ESCUADRAS <span class="text-pink">OFICIALES</span>','Plantillas y equipos inscritos en la competición.') }<div class="teams-grid">${data().teams.length?data().teams.map(teamCard).join(''):`<div class="empty">${icon('users')}Todavía no hay equipos registrados.</div>`}</div>`;}
function rulesView(){return `${pageHead('REGLAMENTO','REGLAS DE <span class="text-pink">LA ARENA</span>','Formato oficial configurado por la administración.') }<div class="rules-grid"><div class="rule-card"><div class="rule-number">01</div><h3>FORMATO ${S().mode}VS${S().mode}</h3><p>Duelo de Escuadras de Free Fire. Cada equipo dispone de 6 titulares base y suplentes ilimitados. El jefe elige ${S().mode} participantes de cada lado para cada partido.</p></div><div class="rule-card"><div class="rule-number">02</div><h3>${data().teams.length} EQUIPOS</h3><p>Liga abierta a ${data().teams.length} participantes. (Sin límite de equipos cuando se configura 0). La administración puede crear enfrentamientos y generar automáticamente el todos contra todos.</p></div><div class="rule-card"><div class="rule-number">03</div><h3>3 PUNTOS</h3><p>Una victoria otorga tres puntos. Una derrota no suma puntos. En los resultados finales no se permite empatar. Las alineaciones se asignan por partida.</p></div><div class="rule-card"><div class="rule-number">04</div><h3>DIFERENCIA DE RONDAS</h3><p>En caso de igual puntuación se considera la diferencia entre rondas ganadas y perdidas (RF − RC).</p></div><div class="rule-card"><div class="rule-number">05</div><h3>RANKING INDIVIDUAL</h3><p>El jefe registra las kills de todos los jugadores en cada enfrentamiento. Las estadísticas individuales se acumulan.</p></div><div class="rule-card"><div class="rule-number">06</div><h3>RESULTADOS OFICIALES</h3><p>Los resultados son administrados por el jefe. ${S().jornadas===2?"Jornada 1: ida; Jornada 2: vuelta invirtiendo local y visitante.":"Una jornada de ida."} Los visitantes pueden verlos y se actualizan periódicamente.</p></div></div><div class="notice" style="margin-top:18px"><strong>Premio / lema:</strong> ${esc(S().prize)}. Los desempates posteriores a la diferencia de rondas se resuelven por rondas a favor, kills y finalmente nombre del equipo.</div>`;}
function uploadCard(kind,title,subtitle,buttonLabel,accept,current,teamId){
  const inputId=`asset-${kind}-${teamId||'site'}`;
  const preview=kind==='music'
    ? `<span class="media-preview-symbol">${icon('volume')}</span>`
    : current?`<img src="${esc(current)}" alt="Vista previa de ${esc(title)}">`:`<span class="media-preview-symbol">${icon(kind==='background'?'eye':'shield')}</span>`;
  return `<div class="media-upload-card" data-kind="${kind}"><div class="media-preview ${kind==='background'?'media-wide':''} ${kind==='music'?'media-audio':''}">${preview}</div><div class="media-details"><div class="media-heading">${esc(title)} ${current?'<span class="asset-active">ACTIVO</span>':'<span class="asset-inactive">SIN ARCHIVO</span>'}</div><p>${esc(subtitle)}</p><div class="media-actions"><button type="button" class="btn btn-primary btn-media" data-action="pick-upload" data-target="${inputId}">${icon('upload')} ${esc(buttonLabel)}</button>${current?`<button type="button" class="btn btn-outline btn-media" data-action="remove-asset" data-kind="${kind}" ${teamId?`data-id="${teamId}"`:''}>${icon('trash')} QUITAR</button>`:''}</div><input class="visually-hidden media-picker" type="file" id="${inputId}" data-instant-upload="${kind}" ${teamId?`data-team-id="${teamId}"`:''} accept="${accept}"><span class="media-file-status">${current?'Puedes reemplazarlo cuando quieras.':'Pulsa el botón para seleccionar tu archivo.'}</span></div></div>`;
}
function settingsForm(){const s=S();return `<div class="admin-grid">
<form class="form-panel" data-form="settings"><h3>IDENTIDAD DEL TORNEO</h3><p>Controla el nombre, la modalidad y los textos que ven todos los visitantes.</p>
<div class="form-grid"><div class="field span2"><label>Nombre del torneo</label><input name="title" maxlength="70" required value="${esc(s.title)}"></div>
<div class="field span2"><label>Eslogan de portada</label><input name="subtitle" maxlength="120" required value="${esc(s.subtitle)}"></div>
<div class="field"><label>Temporada</label><input name="season" maxlength="50" required value="${esc(s.season)}"></div>
<div class="field"><label>Estado en pantalla</label><input name="status" maxlength="35" required value="${esc(s.status)}"></div>
<div class="field"><label>Modalidad</label><select name="mode"><option value="4" ${s.mode===4?'selected':''}>4 VS 4</option><option value="6" ${s.mode===6?'selected':''}>6 VS 6</option></select></div>
<div class="field"><label>Cantidad máxima de equipos</label><input name="max_teams" type="number" min="0" max="2147483647" value="${s.max_teams}" required><span class="field-hint">Escribe 0 para equipos sin límite; o el número que prefieras.</span></div><div class="field"><label>Jornadas oficiales</label><select name="jornadas"><option value="1" ${s.jornadas===1?'selected':''}>1 · SOLO IDA</option><option value="2" ${s.jornadas===2?'selected':''}>2 · IDA Y VUELTA</option></select></div>
<div class="field span2"><label>Anuncio de la competición</label><textarea name="announcement" maxlength="250" required>${esc(s.announcement)}</textarea></div>
<div class="field span2"><label>Premio o lema</label><input name="prize" maxlength="70" required value="${esc(s.prize)}"></div>
<div class="field"><label>Color de la interfaz</label><input type="color" name="accent" value="${esc(s.accent)}"></div></div>
<div class="form-foot"><button class="btn btn-primary" type="submit">${icon('check')} GUARDAR CAMBIOS</button></div></form>
<section class="form-panel media-hub"><div class="media-hub-head"><div><span class="micro text-pink">CENTRO MULTIMEDIA</span><h3>ESTILO & MULTIMEDIA</h3><p>Sube tus archivos desde tu PC. Cada botón guarda y publica el cambio automáticamente.</p></div><div class="media-hub-icon">${icon('upload')}</div></div>
${uploadCard('site-logo','LOGO DE LA PÁGINA','Tu marca en el menú, la portada y el ícono del navegador · PNG, JPG o WEBP (3 MB).','SUBIR LOGO DE LA WEB','image/png,image/jpeg,image/webp',s.site_logo)}
${uploadCard('background','FONDO DE LA PORTADA','Imagen principal visible para todos · PNG, JPG o WEBP (3 MB).','SUBIR FONDO','image/png,image/jpeg,image/webp',s.background)}
${uploadCard('music','MÚSICA AMBIENTAL','MP3, OGG o WAV (9 MB). Los visitantes podrán pausar, ajustar volumen o silenciar.','SUBIR MÚSICA','audio/mpeg,audio/ogg,audio/wav,audio/mp4,.mp3,.ogg,.wav',s.music)}
<div class="notice media-notice">${icon('volume')} La música se reproduce cuando el visitante pulsa Play. Los navegadores bloquean la reproducción automática con sonido.</div>
<details class="media-advanced"><summary>Opciones avanzadas: usar enlaces de fondo o música</summary><form data-form="settings-media"><div class="field"><label>URL de fondo</label><input name="background_url" type="url" placeholder="https://sitio.com/fondo.jpg" value="${esc(s.background_url)}"></div><div class="field"><label>URL de música</label><input name="music_url" type="url" placeholder="https://sitio.com/audio.mp3" value="${esc(s.music_url)}"></div><p class="field-hint">Al escribir un enlace nuevo se reemplaza el archivo subido. Los archivos locales se conservan si dejas el enlace sin cambios.</p><div class="form-foot"><button type="submit" class="btn btn-outline">${icon('check')} GUARDAR ENLACES</button></div></form></details>
</section></div>`;}
function adminTeams(){return `<div class="admin-grid"><form class="form-panel" data-form="create-team"><h3>CREAR NUEVA ESCUADRA</h3><p>Registra un equipo, su logo y una cuenta privada para sus jugadores.</p><div class="field"><label>Nombre oficial del equipo</label><input name="name" required maxlength="70" placeholder="DC ESPORT RED"></div><div class="form-grid"><div class="field"><label>Usuario del equipo</label><input name="username" minlength="4" required maxlength="50" autocomplete="off" placeholder="red.capitan"></div><div class="field"><label>Contraseña inicial</label><input name="password" minlength="10" required type="password" autocomplete="new-password" placeholder="Mínimo 10 caracteres"></div></div><div class="field"><label>Color identificativo</label><input name="color" type="color" value="#eb3da9"></div>
<div class="field"><label>Logo del nuevo equipo (opcional)</label><div class="team-logo-picker"><div class="team-logo-preview" id="new-team-logo-preview">${icon('shield')}</div><div><button type="button" class="btn btn-outline btn-media" data-action="pick-upload" data-target="new-team-logo-file">${icon('upload')} SELECCIONAR LOGO</button><input class="visually-hidden" id="new-team-logo-file" name="logo_file" type="file" data-local-preview="new-team-logo-preview" accept="image/png,image/jpeg,image/webp"><div class="field-hint" data-file-name="new-team-logo-file">PNG, JPG o WEBP · hasta 3 MB</div></div></div></div>
<div class="password-note">${icon('shield')} Solo el jefe puede crear equipos y cuentas. Envía las credenciales por privado al capitán.</div><div class="form-foot" style="margin-top:18px"><button class="btn btn-primary" type="submit" ${S().max_teams>0&&data().teams.length>=S().max_teams?'disabled':''}>${icon('plus')} CREAR EQUIPO</button></div></form>
<div class="form-panel"><h3>CUENTAS & EQUIPOS</h3><p>${data().teams.length} equipos inscritos · ${S().max_teams===0?"sin límite de inscripción":"máximo " + S().max_teams} · gestiona titulares y suplentes.</p><div class="admin-list">${data().teams.length?data().teams.map(t=>`<div class="admin-team"><div class="admin-team-main">${badge(t)}<div><h4>${esc(t.name)}</h4><p>Acceso privado del equipo</p></div></div><div class="admin-team-actions"><button class="icon-btn" data-action="team-details" data-id="${t.id}" title="Ver plantel">${icon('users')}</button><button class="btn btn-outline btn-sm" data-action="team-logo" data-id="${t.id}">${icon('upload')} LOGO</button><button class="icon-btn" data-action="edit-team" data-id="${t.id}" title="Editar logo, nombre y color">${icon('edit')}</button><button class="icon-btn" data-action="credentials" data-id="${t.id}" title="Cambiar usuario y contraseña">${icon('lock')}</button><button class="icon-btn" data-action="delete-team" data-id="${t.id}" title="Eliminar equipo">${icon('trash')}</button></div></div>`).join(''):'<div class="empty">No se han creado equipos.</div>'}</div></div></div>`;}
function adminMatches(){
  const teams=data().teams,legs=S().jornadas;
  const perLeg=teams.length*(teams.length-1)/2;
  return `<section class="form-panel fixtures-panel" style="margin-bottom:18px"><div class="section-head"><div><span class="micro text-pink">CALENDARIO OFICIAL</span><h3>JORNADAS · ${legs===2?'IDA Y VUELTA':'SOLO IDA'}</h3><p style="margin:0">${teams.length} equipos • ${fmt(perLeg)} duelos por jornada • ${fmt(perLeg*legs)} duelos en total.</p></div><button class="btn btn-primary" data-action="fixtures" ${teams.length<2?'disabled':''}>${icon('calendar')} GENERAR CALENDARIO</button></div><div class="phase-preview"><div class="phase-card"><span>JORNADA 01</span><strong>IDA</strong><small>Cruces todos contra todos</small></div>${legs===2?`<div class="phase-card return"><span>JORNADA 02</span><strong>VUELTA</strong><small>Se invierten los locales</small></div>`:''}</div><div class="notice">No se duplican los duelos existentes. Para cambiar entre ida e ida/vuelta, usa <b>Personalización → Jornadas oficiales</b>. No se borran resultados anteriores.</div></section>
  <form class="form-panel" data-form="create-match" style="margin-bottom:18px"><h3>AÑADIR DUELO MANUAL</h3><p>Selecciona equipos y jornada para agregar un partido.</p><div class="fixture-add"><div class="field"><label>Equipo local</label><select name="home_id" required>${teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div><div class="field"><label>Equipo visitante</label><select name="away_id" required>${teams.map((t,i)=>`<option value="${t.id}" ${i===1?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div><div class="field"><label>Jornada</label><select name="round_no"><option value="1">1 · IDA</option>${legs===2?'<option value="2">2 · VUELTA</option>':''}</select></div><button class="btn btn-ghost" type="submit" ${teams.length<2?'disabled':''}>${icon('plus')} AÑADIR</button></div></form>
  ${[...new Set([1,...(legs===2?[2]:[]),...data().matches.map(m=>Number(m.round_no))])].sort((a,b)=>a-b).map(leg=>{const matches=data().matches.filter(m=>Number(m.round_no)===leg);return `<section class="form-panel match-day-panel"><div class="section-head"><div><span class="micro text-pink">JORNADA ${String(leg).padStart(2,'0')}</span><h3>${leg===1?'PARTIDOS DE IDA':leg===2?'PARTIDOS DE VUELTA':'PARTIDOS ADICIONALES'}</h3><p>${matches.filter(m=>m.status==='finished').length} de ${matches.length} finalizados</p></div><span class="match-day-tag">${leg===1?'IDA':'VUELTA'}</span></div><div class="admin-list">${matches.length?matches.map(m=>`<div class="admin-team"><div class="admin-team-main"><div class="stat-icon">${icon('swords')}</div><div><h4>${esc(m.home_name)} VS ${esc(m.away_name)}</h4><p>${m.status==='finished'?`RESULTADO ${m.score_home} — ${m.score_away}`:'PENDIENTE'} · ${(m.lineup||[]).length} jugadores alineados</p></div></div><div class="admin-team-actions"><button class="btn btn-outline btn-sm" data-action="edit-match" data-id="${m.id}">${icon('users')} ALINEACIÓN / KILLS</button>${m.status==='finished'?`<button class="icon-btn" data-action="reset-match" data-id="${m.id}" title="Borrar resultado">${icon('refresh')}</button>`:''}<button class="icon-btn" data-action="delete-match" data-id="${m.id}" title="Eliminar duelo">${icon('trash')}</button></div></div>`).join(''):'<div class="empty">Genera el calendario para crear los cruces.</div>'}</div></section>`;}).join('')}`;
}

function admin(){
  if(!isAdmin())return forbidden();
  const tabs=isOwner()?[['settings','Personalización'],['teams','Equipos y cuentas'],['staff','Administradores'],['matches','Jornadas y kills'],['security','Mi seguridad']]:[['matches','Jornadas y kills'],['security','Mi seguridad']];
  const active=tabs.some(x=>x[0]===state.adminTab)?state.adminTab:'matches';
  return `${pageHead('ADMINISTRACIÓN GENERAL',isOwner()?'CENTRO DE <span class="text-pink">COMANDO</span>':'PANEL DE <span class="text-pink">ÁRBITRAJE</span>',isOwner()?'Acceso exclusivo del jefe. Controla todas las áreas de la liga.':'Cuenta autorizada para gestionar jornadas, alineaciones y resultados.')}<div class="admin-tabs">${tabs.map(([v,label])=>`<button class="tab-btn ${active===v?'active':''}" data-action="admin-tab" data-tab="${v}">${label}</button>`).join('')}</div>${active==='settings'?settingsForm():active==='teams'?adminTeams():active==='staff'?staffPanel():active==='matches'?adminMatches():security()}`;
}

function staffPanel(){
  return `<div class="admin-grid"><form class="form-panel" data-form="add-staff"><h3>CREAR ADMINISTRADOR</h3><p>Los administradores pueden gestionar jornadas, elegir alineaciones, registrar kills y publicar marcadores. Solo el jefe modifica usuarios y personalización.</p><div class="field"><label>Nombre de usuario</label><input name="username" required minlength="4" maxlength="50" autocomplete="off" placeholder="admin.liga"></div><div class="field"><label>Contraseña</label><input name="password" type="password" required minlength="10" maxlength="120" autocomplete="new-password" placeholder="10 caracteres o más"></div><div class="form-foot"><button class="btn btn-primary" type="submit">${icon('plus')} CREAR ADMINISTRADOR</button></div></form><div class="form-panel"><h3>ADMINISTRADORES AUTORIZADOS</h3><p>Controla los accesos de tu equipo de trabajo.</p><div id="staff-list" class="admin-list"><p class="micro">Cargando cuentas...</p></div><button type="button" class="btn btn-ghost btn-sm" data-action="staff-refresh">${icon('refresh')} ACTUALIZAR LISTA</button></div></div>`;
}
async function loadStaff(){
  const target=$('#staff-list');if(!target)return;
  try{const res=await api('/admin/staff');if(!$('#staff-list'))return;
    target.innerHTML=res.admins.length?res.admins.map(a=>`<div class="admin-team"><div class="admin-team-main"><div class="stat-icon">${icon('shield')}</div><div><h4>${esc(a.username)}</h4><p>Administrador de encuentros</p></div></div><button class="btn btn-outline btn-sm" data-action="staff-delete" data-id="${a.id}">${icon('trash')} REVOCAR</button></div>`).join(''):'<div class="empty">Aún no hay administradores auxiliares.</div>';
  }catch(e){target.textContent=e.message;}
}
function security(){return `<div class="admin-grid"><form class="form-panel" data-form="password"><h3>CAMBIAR CONTRASEÑA</h3><p>La nueva clave cierra tus sesiones anteriores. No compartas tus credenciales.</p><div class="field"><label>Contraseña actual</label><input type="password" name="current" autocomplete="current-password" required></div><div class="field"><label>Contraseña nueva</label><input type="password" name="password" minlength="10" maxlength="120" required autocomplete="new-password"></div><div class="form-foot"><button class="btn btn-primary" type="submit">${icon('lock')} ACTUALIZAR CONTRASEÑA</button></div></form>${isOwner()?`<form class="form-panel" data-form="username"><h3>USUARIO DEL JEFE</h3><p>Nombre para entrar al panel principal. Después del cambio tendrás que iniciar sesión nuevamente.</p><div class="field"><label>Nuevo usuario</label><input type="text" name="username" minlength="4" maxlength="50" required value="${esc(me().username)}"></div><div class="field"><label>Confirma tu contraseña actual</label><input type="password" name="current" required autocomplete="current-password"></div><div class="form-foot"><button class="btn btn-outline" type="submit">${icon('check')} ACTUALIZAR USUARIO</button></div></form>`:''}</div>`;}
function forbidden(){return `<div class="empty">${icon('lock')}Necesitas iniciar sesión con una cuenta autorizada.</div>`;}
function roster(){
  if(!me())return forbidden();
  const t=teamById(me().role==='team'?me().team_id:(state.rosterTeamId||data().teams[0]?.id));
  if(!t)return `<div class="empty">Todavía no hay equipos.</div>`;
  const players=playersByTeam(t.id),starters=players.filter(p=>p.slot<=6),subs=players.filter(p=>p.slot>6);
  const card=p=>`<div class="roster-card">${playerPic(p)}<div class="roster-card-body"><small>${p.slot<=6?'TITULAR':'SUPLENTE'} ${String(p.slot).padStart(2,'0')}</small><strong>${esc(p.nickname)}</strong><div class="roster-actions"><button data-action="edit-player" data-id="${p.id}">${icon('edit')} EDITAR</button>${p.slot>6?`<button class="roster-danger" data-action="remove-player" data-id="${p.id}" title="Quitar suplente">${icon('trash')}</button>`:''}</div></div></div>`;
  return `${pageHead('PANEL DE PLANTILLA',esc(t.name),'6 titulares de plantilla y tantos suplentes como necesites. Para cada duelo el jefe selecciona '+S().mode+' jugadores por equipo.',`<button class="btn btn-ghost" data-action="nav" data-view="teams">${icon('users')} VER ESCUADRAS</button>`)}
  <div class="roster-brand-panel"><div class="roster-brand-identity">${badge(t)}<div><strong>${esc(t.name)}</strong><p>Los nombres de los jugadores llevan DC. automáticamente.</p></div></div><button class="btn btn-primary" data-action="team-logo" data-id="${t.id}">${icon('upload')} CAMBIAR LOGO DEL EQUIPO</button></div>
  <div class="roster-section-head"><div><span class="micro text-pink">PLANTILLA PRINCIPAL</span><h2>6 TITULARES</h2><p>Los titulares base siempre están disponibles para editar.</p></div><span class="roster-count">${starters.length} / 6</span></div>
  <div class="roster-grid">${starters.map(card).join('')}</div>
  <div class="roster-section-head"><div><span class="micro text-pink">BANQUILLO</span><h2>SUPLENTES</h2><p>Agrega jugadores sin límite. Los seleccionará el jefe por enfrentamiento.</p></div><button class="btn btn-primary" data-action="add-player" data-id="${t.id}">${icon('plus')} AGREGAR SUPLENTE</button></div>
  ${subs.length?`<div class="roster-grid">${subs.map(card).join('')}</div>`:`<div class="notice">Todavía no hay suplentes. Pulsa Agregar suplente para registrar uno.</div>`}
  <div style="margin-top:24px">${security()}</div>`;
}

function render(){if(!data())return;let view=state.view;if(view==='admin'&&!isAdmin())view='home';if(view==='roster'&&!me())view='home';const pages={home,standings,matches:matchesView,kills:killsView,teams:teamsView,rules:rulesView,admin,roster};$('#app').innerHTML=shell((pages[view]||home)());if(view==='admin'&&state.adminTab==='staff')loadStaff();}
function modal(content,large=false){$('#modal-layer').innerHTML=`<div class="overlay" data-overlay="true"><div class="modal ${large?'large':''}" role="dialog" aria-modal="true">${content}</div></div>`;document.body.classList.add('modal-open');setTimeout(()=>$('#modal-layer input:not([type=hidden])')?.focus(),50);}
function closeModal(){$('#modal-layer').innerHTML='';document.body.classList.remove('modal-open');}
const modalHead=(title,desc='')=>`<header class="modal-head"><div><div class="eyebrow">DC ESPORT</div><h2>${title}</h2>${desc?`<p style="margin:5px 0 0">${desc}</p>`:''}</div><button class="modal-close" data-action="close-modal" aria-label="Cerrar">×</button></header>`;
function loginModal(){modal(`${modalHead('ACCESO PRIVADO','Ingresa como jefe o como representante de un equipo.')}<form data-form="login"><div class="field"><label>Nombre de usuario</label><input name="username" maxlength="50" required autocomplete="username" placeholder="Usuario asignado"></div><div class="field"><label>Contraseña</label><input name="password" type="password" required autocomplete="current-password" placeholder="••••••••••"></div><button class="btn btn-primary" style="width:100%" type="submit">${icon('lock')} INGRESAR AL PANEL</button><p style="margin:17px 0 0;text-align:center">¿Eres visitante? Cierra esta ventana y navega libremente.</p></form>`);}
function userMenu(){modal(`${modalHead('MI SESIÓN','Cuenta: '+esc(me().username))}<div class="btn-row"><button class="btn btn-ghost" data-action="goto-panel">${icon('settings')} IR A MI PANEL</button><button class="btn btn-danger" data-action="logout">${icon('logout')} CERRAR SESIÓN</button></div>`);}
function teamDetails(id){const t=teamById(id);if(!t)return;const list=playersByTeam(id);const s=data().standings.find(x=>Number(x.team_id)===Number(id));modal(`${modalHead(esc(t.name),'Plantilla oficial · '+S().mode+'VS'+S().mode)}<div style="display:flex;align-items:center;gap:18px;margin-bottom:24px">${badge(t)}<div><div class="stat-number" style="font-size:40px">${s?.points||0} <span style="color:var(--muted);font-size:16px">PTS</span></div><span class="micro">${s?.wins||0} victorias · ${s?.played||0} partidas</span></div></div><div class="roster-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">${list.map(p=>`<div class="roster-card" style="padding:11px">${playerPic(p)}<div class="roster-card-body"><small>${p.slot<=6?"TITULAR":"SUPLENTE"} #${p.slot}</small><strong style="font-size:17px">${esc(p.nickname)}</strong></div></div>`).join('')}</div>${canEditTeam(id)?`<div class="form-foot" style="margin-top:18px"><button class="btn btn-primary" data-action="open-roster" data-id="${id}">${icon('edit')} EDITAR PLANTILLA</button></div>`:''}`,true);}
function teamLogoModal(id){const t=teamById(id);if(!t||!canEditTeam(id))return;modal(`${modalHead('LOGO DE ESCUADRA','Este escudo aparecerá en toda la página pública.')}${uploadCard('team-logo',t.name,'Sube un PNG, JPG o WEBP, máximo 3 MB. Se publica en cuanto lo seleccionas.','SUBIR LOGO DEL EQUIPO','image/png,image/jpeg,image/webp',t.logo_url,id)}<p class="field-hint" style="margin-top:14px">El jefe también puede cambiar el logo de cualquier equipo.</p>`);}
function editTeamModal(id){const t=teamById(id);if(!t)return;modal(`${modalHead('PERSONALIZAR EQUIPO','Edita los datos visibles para los visitantes.')}<form data-form="edit-team" data-id="${id}"><div class="field"><label>Nombre del equipo</label><input name="name" maxlength="70" required value="${esc(t.name)}"></div><div class="field"><label>Color del equipo</label><input name="color" type="color" value="${esc(t.color)}"></div><div class="field"><label>Logo del equipo</label><button class="btn btn-outline btn-media" type="button" data-action="pick-upload" data-target="edit-team-file">${icon('upload')} SELECCIONAR LOGO</button><input class="visually-hidden" id="edit-team-file" name="logo_file" type="file" accept="image/png,image/jpeg,image/webp"><div class="field-hint" data-file-name="edit-team-file">PNG, JPG o WEBP · máximo 3 MB. Guarda el equipo para publicar.</div></div><label class="check-row" style="margin:0 0 19px"><input type="checkbox" name="remove_logo"> Eliminar logo actual</label><button class="btn btn-primary" style="width:100%" type="submit">${icon('check')} GUARDAR EQUIPO</button></form>`);}
async function credentialsModal(id){const team=teamById(id);if(!team)return;let account;try{account=(await api('/admin/accounts')).accounts.find(a=>Number(a.team_id)===Number(id));}catch(e){toast(e.message,true);return;}modal(`${modalHead('CREDENCIALES','Cambia la cuenta del equipo '+esc(team.name))}<form data-form="credentials" data-id="${id}"><div class="field"><label>Usuario del equipo</label><input name="username" minlength="4" maxlength="50" required value="${esc(account?.username||'')}"></div><div class="field"><label>Nueva contraseña</label><input name="password" type="password" minlength="10" required placeholder="Mínimo 10 caracteres"></div><p class="notice">Al cambiar los datos, se cerrarán las sesiones anteriores del equipo.</p><button class="btn btn-primary" type="submit" style="width:100%">${icon('lock')} ACTUALIZAR ACCESO</button></form>`);}
function addPlayerModal(teamId){
  if(!canEditTeam(teamId))return;
  const t=teamById(teamId);if(!t)return;
  modal(`${modalHead('AGREGAR SUPLENTE',esc(t.name)+' · plazas sin límite')}<form data-form="add-player" data-id="${teamId}"><div class="field"><label>Nombre de Free Fire</label><input name="nickname" maxlength="26" required placeholder="Ejemplo: GHOST"><div class="field-hint">Se añadirá el prefijo DC. automáticamente.</div></div><div class="field"><label>Foto del suplente (opcional)</label><input name="photo_file" type="file" accept="image/png,image/jpeg,image/webp"></div><button class="btn btn-primary" type="submit" style="width:100%">${icon('plus')} GUARDAR SUPLENTE</button></form>`);
}
function editPlayerModal(id){const p=data().players.find(x=>Number(x.id)===Number(id));if(!p||!canEditTeam(p.team_id))return;modal(`${modalHead('PERFIL DEL JUGADOR','Jugador '+p.slot+' · '+esc(teamById(p.team_id)?.name))}<form data-form="edit-player" data-id="${p.id}"><div class="field"><label>Nombre en Free Fire (el prefijo DC. se añade automáticamente)</label><input name="nickname" required maxlength="26" value="${esc(p.nickname.replace(/^DC\./i,''))}" placeholder="MAXII"></div><div class="field"><label>Fotografía del jugador</label><input name="photo_file" type="file" accept="image/png,image/jpeg,image/webp"><div class="field-hint">PNG, JPG o WEBP · máximo 3 MB.</div></div><label class="check-row" style="margin-bottom:18px"><input type="checkbox" name="remove_photo"> Quitar fotografía actual</label><button class="btn btn-primary" style="width:100%" type="submit">${icon('check')} GUARDAR PERFIL</button></form>`);}
function lineupChoice(p,selected,kills){
  const chosen=selected.has(Number(p.id));
  return `<div class="lineup-player ${chosen?'selected':''}" data-player-row="${p.id}"><label class="lineup-player-name"><input class="lineup-check" type="checkbox" data-lineup-check="1" data-team-id="${p.team_id}" data-player-id="${p.id}" ${chosen?'checked':''}>${playerPic(p)}<span>${esc(p.nickname)}<small>${p.slot<=6?'TITULAR':'SUPLENTE'}</small></span></label><div class="lineup-kills"><small>KILLS</small><input type="number" min="0" max="999" data-player-id="${p.id}" value="${kills.get(Number(p.id))||0}" ${chosen?'':'disabled'}></div></div>`;
}
function matchResultModal(id){
  const m=data().matches.find(x=>Number(x.id)===Number(id));if(!m)return;
  const pHome=playersByTeam(m.home_id),pAway=playersByTeam(m.away_id),mode=S().mode;
  const selectSide=(teamId,players)=>{
    const saved=(m.lineup||[]).filter(l=>Number(l.team_id)===Number(teamId)).map(l=>Number(l.player_id));
    return new Set(saved.length?saved:players.slice(0,mode).map(p=>Number(p.id)));
  };
  const selectedHome=selectSide(m.home_id,pHome),selectedAway=selectSide(m.away_id,pAway);
  const kills=new Map(m.match_kills.map(k=>[Number(k.player_id),k.count]));
  const side=(teamId,teamName,players,selected)=>`<section class="lineup-side" data-lineup-side="${teamId}"><div class="lineup-side-head"><h3>${esc(teamName)}</h3><span class="lineup-count">${selected.size} / ${mode} elegidos</span></div><div class="lineup-player-scroll">${players.map(p=>lineupChoice(p,selected,kills)).join('')}</div></section>`;
  modal(`${modalHead('ACTA OFICIAL · '+(m.round_no===2?'VUELTA':'IDA'),`Jornada ${m.round_no} · elige ${mode} jugadores de cada lado, incluidos suplentes`)}<form data-form="match-result" data-id="${id}"><div class="result-row"><div class="result-team">${esc(m.home_name)}</div><input type="number" name="score_home" min="0" max="99" required value="${m.score_home??0}"><span class="vs-small">:</span><input type="number" name="score_away" min="0" max="99" required value="${m.score_away??0}"><div class="result-team">${esc(m.away_name)}</div></div><div class="lineup-heading"><h3 class="section-title">ALINEACIONES & <span class="text-pink">KILLS</span></h3><p>Selecciona los jugadores que participarán en esta partida. Los suplentes no seleccionados no suman partidas ni kills.</p></div><div class="lineup-grid">${side(m.home_id,m.home_name,pHome,selectedHome)}${side(m.away_id,m.away_name,pAway,selectedAway)}</div><p class="micro" style="margin:17px 0">Elige exactamente ${mode} por equipo. Registra las kills de cada elegido (0 si no eliminó). No se aceptan empates.</p><div class="form-foot lineup-footer"><button type="button" class="btn btn-outline" data-action="save-lineup" data-id="${id}" ${m.status==='finished'?'disabled title="Reinicia o edita el resultado para cambiar una alineación finalizada"':''}>${icon('users')} GUARDAR ALINEACIÓN</button><button class="btn btn-primary" type="submit">${icon('check')} PUBLICAR RESULTADO</button></div></form>`,true);
}
function selectedMatchLineup(form){
  const m=data().matches.find(x=>Number(x.id)===Number(form.dataset.id));
  const home_players=$$('input[data-lineup-check]:checked',form).filter(x=>Number(x.dataset.teamId)===Number(m.home_id)).map(x=>Number(x.dataset.playerId));
  const away_players=$$('input[data-lineup-check]:checked',form).filter(x=>Number(x.dataset.teamId)===Number(m.away_id)).map(x=>Number(x.dataset.playerId));
  if(home_players.length!==S().mode||away_players.length!==S().mode)throw Error(`Debes seleccionar exactamente ${S().mode} jugadores de cada equipo.`);
  return{home_players,away_players};
}

function matchLineupModal(id){
  const m=data().matches.find(x=>Number(x.id)===Number(id));if(!m)return;
  const listSide=(teamId,name)=>{
    const selected=(m.lineup||[]).filter(x=>Number(x.team_id)===Number(teamId));
    const players=selected.map(x=>data().players.find(p=>Number(p.id)===Number(x.player_id))).filter(Boolean);
    return `<section class="lineup-side"><h3>${esc(name)}</h3>${players.length?players.map(p=>`<div class="lineup-player selected">${playerPic(p)} <strong>${esc(p.nickname)}</strong><small>${p.slot<=6?'TITULAR':'SUPLENTE'}</small></div>`).join(''):'<p class="micro">Alineación aún no confirmada por administración.</p>'}</section>`;
  };
  modal(`${modalHead('ALINEACIONES OFICIALES',`Jornada ${m.round_no} · ${m.round_no===2?'VUELTA':'IDA'}`)}<div class="lineup-grid">${listSide(m.home_id,m.home_name)}${listSide(m.away_id,m.away_name)}</div>`,true);
}
function matchKillsModal(id){const m=data().matches.find(x=>Number(x.id)===Number(id));if(!m)return;const groups=[m.home_id,m.away_id].map(tid=>{const team=teamById(tid);return `<section><h3 class="section-title" style="color:${esc(team?.color||'#fff')}">${esc(team?.name)}</h3>${m.match_kills.filter(k=>Number(k.team_id)===Number(tid)).sort((a,b)=>b.count-a.count).map(k=>`<div class="leader-item"><div class="leader-info"><div class="leader-name">${esc(k.nickname)}</div></div><div class="kill-number">${k.count}</div></div>`).join('')||'<p class="micro">Sin kills registradas.</p>'}</section>`;});modal(`${modalHead('KILLS DEL DUELO',esc(m.home_name)+' '+m.score_home+' — '+m.score_away+' '+esc(m.away_name))}<div class="admin-grid">${groups.join('')}</div>`,true);}
async function uploadFile(file,kind,teamId){if(!file)return null;const fd=new FormData();fd.append('file',file);fd.append('kind',kind);if(teamId)fd.append('team_id',String(teamId));const r=await api('/media','POST',fd);return r.id;}
function settingsPatch(payload){return api('/admin/settings','POST',{...S(),...payload});}
async function instantUpload(input){
  if(!input.files?.length)return;
  const file=input.files[0],kind=input.dataset.instantUpload,teamId=Number(input.dataset.teamId||0);
  const max=kind==='music'?9:3;
  if(file.size>max*1024*1024){toast(`El archivo supera el límite de ${max} MB.`,true);input.value='';return;}
  const card=input.closest('.media-upload-card');const status=card?.querySelector('.media-file-status');
  const btn=card?.querySelector('[data-action="pick-upload"]');
  if(btn)btn.disabled=true;
  if(status)status.textContent=`Subiendo ${file.name}...`;
  state.busy=true;
  try{
    const isTeam=kind==='team-logo';
    const id=await uploadFile(file,(isTeam||kind==='site-logo')?'logo':kind,isTeam?teamId:undefined);
    if(isTeam)await api(`/teams/${teamId}/logo`,'PATCH',{logo_id:id});
    else if(kind==='site-logo')await settingsPatch({site_logo_id:id});
    else if(kind==='background')await settingsPatch({background_id:id,background_url:''});
    else if(kind==='music')await settingsPatch({music_id:id,music_url:''});
    else throw Error('Tipo de archivo desconocido.');
    await refresh();toast('¡Archivo publicado! Todos podrán ver el cambio.');
    if(isTeam)closeModal();
  }catch(e){toast(e.message,true);if(status)status.textContent='No se pudo subir. Comprueba el archivo e inténtalo de nuevo.';}
  finally{state.busy=false;if(btn)btn.disabled=false;input.value='';}
}
function fields(form){return Object.fromEntries(new FormData(form));}
async function handleForm(form){const kind=form.dataset.form,f=fields(form);const button=form.querySelector('[type="submit"]');if(button){button.disabled=true;button.dataset.oldText=button.innerHTML;button.textContent='GUARDANDO...';}try{
  state.busy=true;
  switch(kind){
    case 'login':await api('/login','POST',{username:f.username,password:f.password});closeModal();await refresh();toast('¡Bienvenido a la arena!');if(isAdmin())loadView('admin');else loadView('roster');break;
    case 'settings':await api('/admin/settings','POST',{...S(),...f,mode:Number(f.mode),max_teams:Number(f.max_teams),jornadas:Number(f.jornadas)});await refresh();toast('Configuración general actualizada.');break;
    case 'settings-media':{
      let bg=S().background_id,music=S().music_id;
      const bgurl=(f.background_url||'').trim(),musicurl=(f.music_url||'').trim();
      if(bgurl && bgurl!==S().background_url)bg=null;
      if(musicurl && musicurl!==S().music_url)music=null;
      await api('/admin/settings','POST',{...S(),background_id:bg,music_id:music,background_url:bgurl,music_url:musicurl});
      await refresh();toast('Enlaces multimedia guardados.');break;
    }
    case 'add-staff':await api('/admin/staff','POST',{username:f.username,password:f.password});await loadStaff();form.reset();toast('Nuevo administrador creado.');break;
    case 'create-team':{
      const file=form.elements.logo_file.files[0];
      const logo_id=file?await uploadFile(file,'logo'):null;
      await api('/admin/teams','POST',{name:f.name,username:f.username,password:f.password,color:f.color,logo_id});
      state.adminTab='teams';await refresh();toast('Equipo, logo y cuenta creados correctamente.');break;
    }
    case 'edit-team':{
      const id=form.dataset.id,t=teamById(id);let logo_id=t.logo_id;
      if(form.elements.remove_logo.checked)logo_id=null;
      else if(form.elements.logo_file.files[0])logo_id=await uploadFile(form.elements.logo_file.files[0],'logo');
      await api('/admin/teams/'+id,'PATCH',{name:f.name,color:f.color,logo_id});closeModal();await refresh();toast('Escuadra actualizada.');break;
    }
    case 'credentials':await api('/admin/teams/'+form.dataset.id+'/credentials','POST',{username:f.username,password:f.password});closeModal();toast('Credenciales cambiadas. Comparte la nueva contraseña en privado.');break;
    case 'create-match':await api('/admin/matches','POST',{home_id:Number(f.home_id),away_id:Number(f.away_id),round_no:Number(f.round_no)});state.adminTab='matches';await refresh();toast('Nuevo enfrentamiento creado.');break;
    case 'match-result':{
      const selection=selectedMatchLineup(form);
      // Solo las cajas NUMÉRICAS de los jugadores alineados; las casillas de
      // selección también tienen data-player-id y antes se enviaban como kills.
      const ids=[...selection.home_players,...selection.away_players];
      const kills=ids.map(playerId=>{
        const input=form.querySelector(`.lineup-kills input[type="number"][data-player-id="${playerId}"]`);
        if(!input||input.disabled||input.value.trim()==='')
          throw Error('Completa las kills de todos los jugadores elegidos (puedes poner 0).');
        const count=Number(input.value);
        if(!Number.isInteger(count)||count<0||count>999)
          throw Error('Las kills deben ser números enteros entre 0 y 999.');
        return{player_id:playerId,count};
      });
      await api('/admin/matches/'+form.dataset.id+'/result','POST',{score_home:Number(f.score_home),score_away:Number(f.score_away),kills,...selection});closeModal();await refresh();toast('¡Marcador y ranking actualizados para todos!');break;
    }
    case 'add-player':{
      const teamId=Number(form.dataset.id),file=form.elements.photo_file.files[0];
      const photo_id=file?await uploadFile(file,'photo',teamId):null;
      await api(`/teams/${teamId}/players`,'POST',{nickname:f.nickname,photo_id});
      closeModal();state.rosterTeamId=teamId;state.view='roster';await refresh();toast('Suplente agregado a la plantilla.');break;
    }
    case 'edit-player':{
      const id=Number(form.dataset.id),p=data().players.find(x=>Number(x.id)===id);let photo_id=p.photo_id;
      if(form.elements.remove_photo.checked)photo_id=null;
      else if(form.elements.photo_file.files[0])photo_id=await uploadFile(form.elements.photo_file.files[0],'photo',p.team_id);
      await api(`/teams/${p.team_id}/players/${p.slot}`,'PATCH',{nickname:f.nickname,photo_id});closeModal();await refresh();toast('Perfil actualizado.');break;
    }
    case 'username':await api('/account/username','POST',{username:f.username,current:f.current});closeModal();state.view='home';await refresh();toast('Usuario cambiado. Vuelve a iniciar sesión.');break;
    case 'password':await api('/account/password','POST',{current:f.current,password:f.password});await api('/logout','POST');closeModal();state.view='home';await refresh();toast('Contraseña modificada. Inicia sesión de nuevo.');break;
  }
}catch(e){toast(e.message,true);}finally{state.busy=false;if(button){button.disabled=false;button.innerHTML=button.dataset.oldText||'GUARDAR';}}
}
document.addEventListener('submit',e=>{const form=e.target.closest('form[data-form]');if(!form)return;e.preventDefault();handleForm(form);});
document.addEventListener('change',e=>{const input=e.target;
  if(input.matches('input[data-instant-upload]')){instantUpload(input);return;}
  if(input.matches('input[data-lineup-check]')){
    const side=input.closest('.lineup-side');
    const max=S().mode,selected=$$('input[data-lineup-check]:checked',side);
    if(selected.length>max){input.checked=false;toast(`Máximo ${max} jugadores por equipo.`,true);return;}
    const row=input.closest('.lineup-player');row.classList.toggle('selected',input.checked);
    row.querySelector('input[type="number"]').disabled=!input.checked;
    side.querySelector('.lineup-count').textContent=`${selected.length} / ${max} elegidos`;
    return;
  }
  if(input.matches('input[data-local-preview]')&&input.files?.length){
    const file=input.files[0],target=document.getElementById(input.dataset.localPreview),name=document.querySelector(`[data-file-name="${input.id}"]`);
    if(name)name.textContent=file.name;
    if(target&&file.type.startsWith('image/')){
      const reader=new FileReader();reader.onload=()=>{target.innerHTML=`<img src="${reader.result}" alt="Vista previa del logo">`;};reader.readAsDataURL(file);
    }
  }
});
document.addEventListener('input',e=>{
  if(e.target.id!=='audio-volume')return;
  const audio=$('#site-audio'),n=Number(e.target.value);
  audio.volume=Math.max(0,Math.min(1,n/100));localStorage.setItem('dc-volume',String(audio.volume));
  if(audio.volume>0&&audio.muted){audio.muted=false;localStorage.setItem('dc-muted','0');}
  syncAudioControls();
});
document.addEventListener('click',async e=>{if(e.target?.dataset.overlay==='true')return closeModal();const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action,id=Number(btn.dataset.id);try{
  switch(action){
    case 'nav':loadView(btn.dataset.view);break;
    case 'admin-tab':state.adminTab=btn.dataset.tab;render();break;
    case 'staff-refresh':await loadStaff();break;
    case 'staff-delete':if(confirm('¿Revocar esta cuenta de administrador y cerrar sus sesiones?')){await api('/admin/staff/'+id,'DELETE');await loadStaff();toast('Acceso revocado.');}break;
    case 'login':loginModal();break;
    case 'user-menu':userMenu();break;
    case 'close-modal':closeModal();break;
    case 'goto-panel':closeModal();loadView(isAdmin()?'admin':'roster');break;
    case 'logout':await api('/logout','POST');closeModal();state.view='home';await refresh();toast('Sesión cerrada.');break;
    case 'team-details':teamDetails(id);break;
    case 'edit-team':editTeamModal(id);break;
    case 'team-logo':teamLogoModal(id);break;
    case 'pick-upload':{const input=document.getElementById(btn.dataset.target);input?.click();break;}
    case 'remove-asset':{const k=btn.dataset.kind;if(!confirm('¿Quitar este archivo de la página?'))break;state.busy=true;try{if(k==='team-logo')await api(`/teams/${id}/logo`,'PATCH',{logo_id:null});else if(k==='site-logo')await settingsPatch({site_logo_id:null});else if(k==='background')await settingsPatch({background_id:null,background_url:''});else if(k==='music')await settingsPatch({music_id:null,music_url:''});await refresh();closeModal();toast('Archivo quitado correctamente.');}finally{state.busy=false;}break;}
    case 'credentials':await credentialsModal(id);break;
    case 'add-player':addPlayerModal(id);break;
    case 'remove-player':{
      const p=data().players.find(p=>Number(p.id)===id);if(!p)break;
      if(confirm(`¿Eliminar a ${p.nickname} de la plantilla? Solo se permite si no tiene historial de partidas.`)){
        await api(`/teams/${p.team_id}/players/${id}`,'DELETE');await refresh();toast('Suplente eliminado.');
      }break;
    }
    case 'save-lineup':{
      const form=$('#modal-layer form[data-form="match-result"]');
      const selection=selectedMatchLineup(form);
      await api('/admin/matches/'+id+'/lineup','POST',selection);
      closeModal();await refresh();toast('Alineación guardada y publicada para esta jornada.');break;
    }
    case 'edit-player':editPlayerModal(id);break;
    case 'edit-match':matchResultModal(id);break;
    case 'match-kills':matchKillsModal(id);break;
    case 'match-lineup':matchLineupModal(id);break;
    case 'open-roster':state.rosterTeamId=id;closeModal();loadView('roster');break;
    case 'fixtures':{const out=await api('/admin/fixtures','POST');state.adminTab='matches';await refresh();toast(out.created?`${out.created} enfrentamientos generados.`:'Todos los cruces ya existen.');break;}
    case 'delete-team':if(confirm('¿Eliminar este equipo, sus cuentas, jugadores, resultados y estadísticas? Esta acción no se puede deshacer.')){await api('/admin/teams/'+id,'DELETE');await refresh();toast('Equipo eliminado.');}break;
    case 'delete-match':if(confirm('¿Eliminar definitivamente este enfrentamiento y sus kills?')){await api('/admin/matches/'+id,'DELETE');await refresh();toast('Enfrentamiento eliminado.');}break;
    case 'reset-match':if(confirm('¿Borrar marcador y kills y dejar la partida pendiente?')){await api('/admin/matches/'+id+'/reset','POST');await refresh();toast('Partido reiniciado.');}break;
    case 'music':{const audio=$('#site-audio');if(!S().music){toast('El jefe aún no ha subido música.',true);break;}if(audio.paused){await audio.play();toast('Reproduciendo música.');}else{audio.pause();}syncAudioControls();break;}
    case 'mute':{const audio=$('#site-audio');audio.muted=!audio.muted;localStorage.setItem('dc-muted',audio.muted?'1':'0');syncAudioControls();break;}
  }
}catch(error){toast(error.message,true);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
async function boot(){try{await refresh();}catch(e){$('#app').innerHTML=`<div class="loading-screen"><div class="loading-logo">DC<span>.</span></div><h2>SERVIDOR NO DISPONIBLE</h2><p>${esc(e.message)}</p><button class="btn btn-primary" onclick="location.reload()">REINTENTAR</button></div>`;}}
boot();
setInterval(async()=>{if(!data()||document.hidden)return;try{const typing=$$('input:focus,textarea:focus,select:focus').length>0;await refresh(!state.busy&&state.view!=='admin'&&!typing&&!$('#modal-layer .overlay'));}catch{}},10000);
window.addEventListener('focus',()=>{if(data()&&!state.busy&&state.view!=='admin'&&!$('#modal-layer .overlay')&&!$$('input:focus,textarea:focus,select:focus').length)refresh().catch(()=>{});});
