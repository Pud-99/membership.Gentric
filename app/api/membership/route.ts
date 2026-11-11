import { database } from '@/lib/database';
import { defaults,normalizeConfig,validateConfig,parseRows,vnToday } from '@/lib/membership';
export const dynamic='force-dynamic';
function db(){return database}
function result(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})}
async function admin(req:Request){const secret=process.env.ADMIN_SECRET;if(!secret)return false;const input=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [a,b]=await Promise.all([digest(input),digest(secret)]);return a.every((v,i)=>v===b[i])}
async function config(){const r=await db().prepare('SELECT value FROM settings WHERE key=?').bind('config').first<{value:string}>();return r?normalizeConfig(JSON.parse(r.value)):defaults}
async function customer(req:Request,code:string,key:string){if(await admin(req))return db().prepare('SELECT code,name,active FROM customers WHERE code=?').bind(code).first();return db().prepare('SELECT code,name,active FROM customers WHERE code=? AND token=? AND active=1').bind(code,key).first()}
async function member(code:string){const c=await db().prepare('SELECT code,name FROM customers WHERE code=?').bind(code).first();const invoices=(await db().prepare('SELECT code,amount,points,date FROM invoices WHERE customer=? ORDER BY date DESC').bind(code).all()).results;const redemptions=(await db().prepare('SELECT * FROM redemptions WHERE customer=? ORDER BY date DESC').bind(code).all()).results;const total=invoices.reduce((s,r)=>s+Number(r.points),0),spent=redemptions.reduce((s,r)=>s+Number(r.points),0);return {...c,invoices,redemptions,total,balance:total-spent}}
export async function GET(req:Request){try{const url=new URL(req.url),action=url.searchParams.get('action');
 if(action==='config')return result({config:await config()});
 if(action==='member'){const code=url.searchParams.get('code')||'',key=url.searchParams.get('key')||'';if(!await customer(req,code,key))return result({error:'Liên kết thành viên không hợp lệ hoặc đã ngừng hoạt động.'},404);return result({member:await member(code),config:await config()})}
 if(!await admin(req))return result({error:'Vui lòng đăng nhập quản trị.'},401);
 const customers=(await db().prepare(`SELECT c.*, COALESCE(i.total,0) total, COALESCE(i.total,0)-COALESCE(r.spent,0) balance, COALESCE(i.visits,0) visits FROM customers c LEFT JOIN (SELECT customer,SUM(points) total,COUNT(*) visits FROM invoices GROUP BY customer) i ON c.code=i.customer LEFT JOIN (SELECT customer,SUM(points) spent FROM redemptions GROUP BY customer) r ON c.code=r.customer ORDER BY total DESC,c.code DESC`).all()).results;
 return result({customers,config:await config(),cards:(await db().prepare('SELECT p.*,c.name customer_name FROM physical_cards p LEFT JOIN customers c ON p.customer=c.code ORDER BY p.created_at DESC,p.card_code DESC').all()).results,invoices:(await db().prepare('SELECT i.*,c.name FROM invoices i JOIN customers c ON i.customer=c.code ORDER BY imported DESC,date DESC LIMIT 300').all()).results,imports:(await db().prepare('SELECT * FROM imports ORDER BY date DESC LIMIT 30').all()).results,redemptions:(await db().prepare('SELECT r.*,c.name FROM redemptions r JOIN customers c ON r.customer=c.code ORDER BY date DESC LIMIT 300').all()).results});
 }catch(e){console.error(e);return result({error:'Không thể đọc dữ liệu. Kiểm tra kết nối cơ sở dữ liệu.'},500)}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&origin!==(process.env.APP_ORIGIN||new URL(req.url).origin))return result({error:'Nguồn yêu cầu không hợp lệ.'},403);
 const action=new URL(req.url).searchParams.get('action');
 if(action==='redeem'){
  const body=await req.json() as {code:string;key:string;reward:string;requestId:string};if(!await customer(req,body.code,body.key))return result({error:'Liên kết không hợp lệ.'},403);
  if(!/^[\w-]{20,80}$/.test(body.requestId))return result({error:'Yêu cầu không hợp lệ.'},400);
  const cfg=await config(),r=cfg.rewards.find((r:any)=>r.id===body.reward),today=vnToday();if(!r||today<r.start||today>r.end||today<cfg.start||today>cfg.end)return result({error:'Quà tặng chưa mở hoặc đã hết hạn.'},400);
  const old=await db().prepare('SELECT id FROM redemptions WHERE id=? AND customer=?').bind(body.requestId,body.code).first();if(old)return result({ok:true,id:body.requestId});
  const query=await db().prepare(`INSERT INTO redemptions(id,customer,reward,title,points,date,status) SELECT ?,?,?,?,?,?,'pending' WHERE (SELECT COALESCE(SUM(points),0) FROM invoices WHERE customer=?) - (SELECT COALESCE(SUM(points),0) FROM redemptions WHERE customer=?) >= ? AND (SELECT COUNT(*) FROM redemptions WHERE reward=?) < ?`).bind(body.requestId,body.code,r.id,r.title,r.points,new Date().toISOString(),body.code,body.code,r.points,r.id,r.stock).run();
  if(!query.meta.changes)return result({error:'Chưa đủ điểm hoặc quà đã hết lượt. Vui lòng tải lại.'},409);return result({ok:true,id:body.requestId});
 }
 if(!await admin(req))return result({error:'Mật khẩu quản trị không đúng.'},401);
 if(action==='config'){const cfg=validateConfig(await req.json());await db().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('config',JSON.stringify(cfg)).run();return result({ok:true})}
 if(action==='fulfill'){const {id}=await req.json() as {id:string};await db().prepare("UPDATE redemptions SET status='fulfilled' WHERE id=? AND status='pending'").bind(id).run();return result({ok:true})}
 if(action==='rotateMemberUrl'){
  const {code}=await req.json() as {code:string};if(!code)return result({error:'Thiếu mã khách hàng.'},400);
  const found=await db().prepare('SELECT code FROM customers WHERE code=?').bind(code).first();if(!found)return result({error:'Không tìm thấy khách hàng.'},404);
  await db().prepare('UPDATE customers SET token=? WHERE code=?').bind(crypto.randomUUID()+crypto.randomUUID(),code).run();return result({ok:true})
 }
 if(action==='setMemberActive'){
  const {code,active}=await req.json() as {code:string;active:boolean};
  const changed=await db().prepare('UPDATE customers SET active=? WHERE code=?').bind(active?1:0,code).run();if(!changed.meta.changes)return result({error:'Không tìm thấy khách hàng hoặc trạng thái không đổi.'},404);return result({ok:true})
 }
 if(action==='createCards'){
  const {count}=await req.json() as {count:number};const amount=Math.trunc(Number(count));if(!Number.isFinite(amount)||amount<1||amount>200)return result({error:'Mỗi lần tạo từ 1 đến 200 thẻ.'},400);
  const now=new Date().toISOString(),statements=[];for(let i=0;i<amount;i++){const cardCode='GTR-'+crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();statements.push(db().prepare('INSERT INTO physical_cards(card_code,token,status,created_at) VALUES(?,?,?,?)').bind(cardCode,crypto.randomUUID()+crypto.randomUUID(),'unassigned',now))}
  await db().batch(statements);return result({ok:true,count:amount})
 }
 if(action==='assignCard'){
  const {cardCode,customerCode}=await req.json() as {cardCode:string;customerCode:string};
  const [card,client]=await Promise.all([db().prepare('SELECT card_code FROM physical_cards WHERE card_code=?').bind(cardCode.trim().toUpperCase()).first(),db().prepare('SELECT code FROM customers WHERE code=? AND active=1').bind(customerCode.trim()).first()]);
  if(!card)return result({error:'Không tìm thấy mã thẻ QR.'},404);if(!client)return result({error:'Không tìm thấy khách hàng đang hoạt động.'},404);
  const now=new Date().toISOString();await db().batch([db().prepare("UPDATE physical_cards SET status='disabled' WHERE customer=? AND status='active'").bind(customerCode.trim()),db().prepare("UPDATE physical_cards SET customer=?,status='active',assigned_at=? WHERE card_code=?").bind(customerCode.trim(),now,cardCode.trim().toUpperCase())]);return result({ok:true})
 }
 if(action==='unassignCard'){
  const {cardCode}=await req.json() as {cardCode:string};await db().prepare("UPDATE physical_cards SET customer=NULL,status='unassigned',assigned_at=NULL WHERE card_code=?").bind(cardCode).run();return result({ok:true})
 }
 if(action==='disableCard'){
  const {cardCode}=await req.json() as {cardCode:string};await db().prepare("UPDATE physical_cards SET status='disabled' WHERE card_code=?").bind(cardCode).run();return result({ok:true})
 }
 if(action==='preview'||action==='import'){
  if(Number(req.headers.get('content-length'))>12*1024*1024)return result({error:'File tối đa 10 MB.'},400);
  const form=await req.formData(),file=form.get('file') as File,kind=String(form.get('kind'));
  if(!file||typeof file.arrayBuffer!=='function'||file.size>10*1024*1024||!['customers','invoices'].includes(kind)||!file.name.toLowerCase().endsWith('.xlsx'))return result({error:'Chọn file .xlsx hợp lệ, tối đa 10 MB.'},400);
  // SheetJS is large. Load it only for an actual Excel upload so ordinary
  // member/config requests stay within the managed Node.js memory budget.
  const XLSX=await import('xlsx');
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,sheetRows:10002});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''}) as Record<string,unknown>[];
  const cfg=await config(),cs=await db().prepare('SELECT code FROM customers').all(),inv=await db().prepare('SELECT code,customer,amount FROM invoices').all(),totals=await db().prepare('SELECT customer,SUM(points) total FROM invoices GROUP BY customer').all();
  const plan=parseRows(rows,kind,cfg,new Set(cs.results.map(r=>String(r.code))),new Map(inv.results.map(r=>[String(r.code),{customer:String(r.customer),amount:Number(r.amount)}])),new Map(totals.results.map(r=>[String(r.customer),Number(r.total)])));
  if(action==='preview')return result({...plan,records:plan.records.slice(0,10),count:plan.records.length,errors:plan.errors.slice(0,50),errorCount:plan.errors.length});
  if(plan.errors.length)return result({error:'File có lỗi đối soát. Chưa nhập dữ liệu.',errors:plan.errors.slice(0,50)},400);
  const now=new Date().toISOString();let count=0;
  for(let i=0;i<plan.records.length;i+=80){const batch=plan.records.slice(i,i+80).map(r=>kind==='customers'?db().prepare('INSERT INTO customers(code,name,token,active) VALUES(?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name,active=excluded.active').bind(r.code,r.name,crypto.randomUUID()+crypto.randomUUID(),r.active):db().prepare('INSERT OR IGNORE INTO invoices(code,customer,amount,points,date,imported) VALUES(?,?,?,?,?,?)').bind(r.code,r.customer,r.amount,r.points,r.date,now));const applied=await db().batch(batch);count+=applied.reduce((s,r)=>s+Number(r.meta.changes||0),0)}
  await db().prepare('INSERT INTO imports(id,filename,kind,count,date) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),file.name,kind,count,now).run();return result({ok:true,count,duplicates:plan.duplicates,skipped:plan.skipped});
 }
 return result({error:'Thao tác không tồn tại.'},400);
 }catch(e){console.error(e);return result({error:e instanceof Error && !('code' in e)?e.message:'Không thể xử lý yêu cầu. Vui lòng kiểm tra cấu hình máy chủ.'},400)}}

