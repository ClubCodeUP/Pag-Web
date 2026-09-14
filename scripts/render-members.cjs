// Run from the repository root. Emits an apply_patch patch; never edits source files itself.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const roster = require('../data/members-2026-2.json');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const members = roster.members;
const get = id => { const member = members.find(m => m.id === id); if (!member) throw Error('Unknown member: '+id); return member; };
const order = {Presidente:0,Vicepresidenta:1,Director:2,Coordinador:3,Miembro:4};
const groupMembers = group => members.filter(m => m.group === group).sort((a,b) => order[a.role]-order[b.role] || a.name.localeCompare(b.name,'es'));
// The subject in this supplied landscape photo is on the right; keep her inside the crop.
const portraitPositions = {'daniella-cabrera':'100% 28%'};
function portrait(member) {
  if (!member.image) return `<div class="member-portrait__empty" aria-label="Fotografía no disponible"><span aria-hidden="true">${esc(member.name.split(' ').filter((_,i,a) => i === 0 || i === a.length-1).map(s => s[0]).join(''))}</span><small>Foto por compartir</small></div>`;
  const position = portraitPositions[member.id] ? ` style="object-position: ${portraitPositions[member.id]}"` : '';
  return `<div class="member-portrait__photo"><img src="${esc(member.image)}" alt="${esc(member.name)}" loading="lazy" decoding="async" width="480" height="600"${position}></div>`;
}
const directory = `<nav class="team-areas" aria-label="Áreas del equipo">${roster.groups.map(g => `<a href="#${g.id}">${esc(g.name)}</a>`).join('')}</nav><p class="filter-status">${members.length} personas, muchas formas de sumar. Equipo ${roster.period}.</p>\n` + roster.groups.map(g => {
  const people = groupMembers(g.id);
  return `<section class="team-group" data-team-group="${g.id}" aria-labelledby="${g.id}"><div class="team-group__head"><h3 id="${g.id}">${esc(g.name)}</h3><span data-group-count>${people.length} integrantes</span></div><div class="team-portraits">` + people.map(m => `<article class="member-portrait" id="${m.id}" data-member-name="${esc(m.name)}">${portrait(m)}<h4>${esc(m.name)}</h4><p>${esc(m.role)}</p><p>${esc(m.career)}</p></article>`).join('\n') + '</div></section>';
}).join('\n');
const featured = [
  ['tania-chavez','gianella-silvestre','matias-desmonteix','luz-marina-calderon','joel-pariona','manuel-sebastian-taco','valentino-montes'],
  ['naomi-torres','leonor-balabarca','lesly-campos','gaby-perez','gianpietro-palacios','paula-romero','verika-hinostroza']
];
const wall = '<div class="member-wall" aria-label="Algunas de las personas que forman CODE UP">\n' + featured.map(row => '          <ul class="member-wall__row">\n' + row.map(id => {
  const m = get(id);
  return `            <li><a class="member-wall__tile" href="team.html#${m.id}"><img src="${m.image}" width="560" height="700" alt="${esc(m.name)}" loading="lazy" decoding="async"><span class="member-wall__name" aria-hidden="true">${esc(m.name)}</span></a></li>`;
}).join('\n') + '\n          </ul>').join('\n') + '\n        </div>';
const board = '<div class="ide-scatter ide-scatter--leadership">\n' + groupMembers('directiva-2026').map((m,i) => `                    <article class="ide-scatter__item ide-scatter__item--${i+1}" data-reveal><img src="${m.image}" alt="${esc(m.name)}, ${esc(m.role.toLowerCase())} de CODE UP" loading="lazy" decoding="async"><h3>${esc(m.name)}</h3><p>${esc(m.role.toLowerCase())}</p></article>`).join('\n') + '\n                </div>';
const patch = [];
function update(file, replacements) {
  const source = fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
  let updated = source;
  for (const [expression,value] of replacements) {
    if (!expression.test(updated)) throw Error(`Missing section in ${file}: ${expression}`);
    updated = updated.replace(expression,value);
  }
  if (updated === source) return;
  // One contextual whole-file hunk makes generation deterministic, including subsequent runs.
  patch.push(`*** Update File: ${path.join(root,file).replace(/\\/g,'/')}\n@@\n` + source.trimEnd().split('\n').map(l=>'-'+l).join('\n') + '\n' + updated.trimEnd().split('\n').map(l=>'+'+l).join('\n'));
}
update('team.html', [[/<nav class="team-areas"[\s\S]*?(?=\n<\/section>\n<div class="page-shell"><div class="page-cat-rail")/, directory]]);
update('index.html', [
  [/<div class="member-wall"[\s\S]*?(?=\n      <\/div>\n    <\/section>)/, wall],
  [/<div class="ide-scatter(?: ide-scatter--leadership)?">[\s\S]*?<\/div>/, board],
  [/data-split-words>Directiva 2026(?:-2)?<\/h2>/, 'data-split-words>Directiva 2026-2</h2>'],
  [/<span><strong(?: data-member-total)? data-count="\d+">\d+<\/strong> (?:miembros activos|integrantes)<\/span>/, `<span><strong data-member-total data-count="${members.length}">0</strong> integrantes</span>`],
  [/<strong(?: data-member-total)? data-count="\d+">\d+<\/strong><span>miembros<\/span>/, `<strong data-member-total data-count="${members.length}">0</strong><span>miembros</span>`],
  [/<span(?: data-member-total)?>\d+ (?:activos|integrantes)<\/span>/, `<span data-member-total>${members.length} integrantes</span>`]
]);
if (patch.length) console.log('*** Begin Patch\n' + patch.join('\n') + '\n*** End Patch');
