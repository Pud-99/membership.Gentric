import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
process.loadEnvFile('.env.local');
const origin=process.env.GENTRIC_ORIGIN||process.env.APP_ORIGIN;
if(!origin.startsWith('http://127.0.0.1:')&&!process.env.GENTRIC_ALLOW_REMOTE)throw Error('Remote import requires GENTRIC_ALLOW_REMOTE=1');
const secret=process.env.ADMIN_SECRET||fs.readFileSync('.dev.vars','utf8').match(/^ADMIN_SECRET=(.+)$/m)[1].trim();
const headers={Authorization:'Bearer '+secret,...(process.env.SITES_BYPASS?{'OAI-Sites-Authorization':'Bearer '+process.env.SITES_BYPASS}:{})};
async function upload(name,kind,action){const f=new FormData();f.append('kind',kind);f.append('file',new Blob([fs.readFileSync(path.resolve('..',name))]),name);const r=await fetch(origin+'/api/membership?action='+action,{method:'POST',headers,body:f});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d}
for(const [name,kind] of [['DanhSachKhachHang_KV28102026-153222-623.xlsx','customers'],['DanhSachChiTietHoaDon_KV28102026-153320-496.xlsx','invoices']]){const preview=await upload(name,kind,'preview');console.log(kind,JSON.stringify({count:preview.count,errors:preview.errors,duplicates:preview.duplicates,skipped:preview.skipped,points:preview.points}));assert.equal(preview.errorCount,0);const applied=await upload(name,kind,'import');console.log('Applied:',JSON.stringify(applied));if(kind==='invoices'){const again=await upload(name,kind,'preview');assert.equal(again.count,0);assert.equal(again.points,0);console.log('Duplicate import check passed.');}}
const d=await(await fetch(origin+'/api/membership?action=admin',{headers})).json();console.log(JSON.stringify({customers:d.customers.length,invoices:d.invoices.length,points:d.customers.reduce((s,c)=>s+c.total,0)}));
assert.equal((await fetch(origin+'/api/membership?action=admin')).status,401);
assert.equal((await fetch(origin+'/api/membership?action=member&code=KH001747&key=wrong')).status,404);
const c=d.customers.find(c=>c.code==='KH001747');const m=await(await fetch(origin+'/api/membership?action=member&code='+c.code+'&key='+c.token,{headers:process.env.SITES_BYPASS?{'OAI-Sites-Authorization':'Bearer '+process.env.SITES_BYPASS}:{}})).json();assert.equal(m.member.balance,74);console.log('Member KH001747: 74 points; authorization checks passed.');

