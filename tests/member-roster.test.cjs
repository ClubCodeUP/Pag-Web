const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const roster = require('../data/members-2026-2.json');
const read = file => fs.readFileSync(path.join(root,file),'utf8');

test('the public roster contains only display fields, fifty unique people and confirmed roles', () => {
  assert.equal(roster.period,'2026-2');
  assert.equal(roster.members.length,50);
  assert.equal(new Set(roster.members.map(m=>m.id)).size,50);
  assert.equal(new Set(roster.members.map(m=>m.name)).size,50);
  const groups = new Set(roster.groups.map(g=>g.id));
  for (const m of roster.members) {
    assert.deepEqual(Object.keys(m).sort(),['career','group','id','image','name','role'].sort());
    assert.ok(groups.has(m.group));
    if(m.image) assert.ok(fs.existsSync(path.join(root,m.image)),m.name);
  }
  assert.deepEqual(roster.members.filter(m=>m.group==='directiva-2026').map(m=>[m.name,m.role]).sort(),[
    ['Arturo Alvarez de la Torre','Presidente'],['Gianella Silvestre','Vicepresidenta']
  ]);
  assert.deepEqual(roster.members.filter(m=>m.role==='Director').map(m=>m.name).sort(),['Manuel Sebastian Taco','Matias Desmonteix']);
  assert.ok(roster.members.some(m=>m.name==='Pamela Geraldine Malpartida'));
  assert.deepEqual(roster.members.filter(m=>!m.image).map(m=>m.name),['Manuel Fidel Serna']);
  assert.doesNotMatch(read('data/members-2026-2.json'),/@|tel:|fecha.*nacimiento|celular|codigo.*up/i);
});

test('the directory and the homepage portraits agree with the same roster', () => {
  const team = read('team.html');
  const home = read('index.html');
  assert.equal((home.match(/data-member-total data-count="50"/g)||[]).length,2);
  assert.match(home,/<span data-member-total>50 integrantes<\/span>/);
  assert.doesNotMatch(home,/74 activos|74.*miembros|50.*miembros activos/);
  const names = [...team.matchAll(/data-member-name="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(names.sort(),roster.members.map(m=>m.name).sort());
  const wall = home.match(/<div class="member-wall"[\s\S]*?(?=\n      <\/div>\n    <\/section>)/)[0];
  const tiles = [...wall.matchAll(/href="team.html#([^"]+)"/g)].map(m=>m[1]);
  assert.equal(tiles.length,14);
  assert.equal(new Set(tiles).size,14);
  for(const id of tiles) {
    const person = roster.members.find(m=>m.id===id);
    assert.ok(person,id);
    assert.ok(wall.includes(`src="${person.image}"`));
    assert.ok(team.includes(`id="${id}"`));
  }
  const board = home.match(/<div class="ide-scatter ide-scatter--leadership">[\s\S]*?<\/div>/)[0];
  assert.equal((board.match(/<article /g)||[]).length,2);
  for(const m of roster.members.filter(m=>m.group==='directiva-2026')) assert.ok(board.includes(m.image));
  for(const stale of ['Jean Trujillo','Kassey Bautista','Nathalia Villalobos','Luciana Pereyra']) {
    assert.ok(!team.includes(stale),stale);
    assert.ok(!board.includes(stale),stale);
  }
});

test('the member rendering script is idempotent', () => {
  assert.equal(execFileSync(process.execPath,['scripts/render-members.cjs'],{cwd:root,encoding:'utf8'}).trim(),'');
});
