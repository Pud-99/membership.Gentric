export type Tier={name:'Standard'|'VIP';min:number;rate:number;benefit:string};
export type Config={title:string;start:string;end:string;policy:string;tiers:Tier[];rewards:{id:string;title:string;description:string;points:number;kind:string;stock:number;start:string;end:string}[]};
export const defaults:Config={title:'Chơi hết mình. Nhận đặc quyền.',start:'2026-10-01',end:'2026-12-31',policy:'Thành viên Standard và VIP được tích điểm theo tỷ lệ riêng của từng hạng. Điểm được làm tròn xuống theo từng hóa đơn hoàn thành. Điểm xét hạng là tổng điểm tích lũy, không giảm khi đổi quà. Điểm hiện chưa có thời hạn hết hạn. Quà tặng được nhận tại quầy sau khi nhân viên xác nhận. Đây là chính sách mẫu, Gentric có thể điều chỉnh cho chương trình chính thức.',tiers:[{name:'Standard',min:0,rate:10000,benefit:'Tích điểm và đổi quà dành cho thành viên Standard'},{name:'VIP',min:500,rate:15000,benefit:'Mở khóa đặc quyền dành riêng cho thành viên VIP'}],rewards:[{id:'ps5-hour',title:'Thêm 1 giờ. Thêm trận hay.',description:'Voucher 1 giờ chơi PS5 tại khu vực Duo.',points:100,kind:'game',stock:100,start:'2026-10-01',end:'2026-12-31'},{id:'drink',title:'Nạp năng lượng, tiếp cuộc vui.',description:'Một phần nước uống trong menu áp dụng.',points:40,kind:'drink',stock:200,start:'2026-10-01',end:'2026-12-31'},{id:'nintendo',title:'Cả hội cùng vào game.',description:'Voucher 30 phút Nintendo Switch cùng bạn bè.',points:80,kind:'switch',stock:100,start:'2026-10-01',end:'2026-12-31'}]};
export function normalizeConfig(raw:any):Config{if(!raw||typeof raw!=='object')return structuredClone(defaults);const oldRate=Number.isSafeInteger(raw.rate)&&raw.rate>0?raw.rate:defaults.tiers[0].rate,oldTiers=Array.isArray(raw.tiers)?raw.tiers:[],hasNewTiers=oldTiers.some((t:any)=>String(t?.name).toLowerCase()==='standard')&&oldTiers.some((t:any)=>String(t?.name).toLowerCase()==='vip'),standard=oldTiers.find((t:any)=>String(t?.name).toLowerCase()==='standard')||oldTiers[0],vip=oldTiers.find((t:any)=>String(t?.name).toLowerCase()==='vip')||oldTiers.find((t:any)=>String(t?.name).toLowerCase()==='gold')||oldTiers[1];return{title:typeof raw.title==='string'?raw.title:defaults.title,start:typeof raw.start==='string'?raw.start:defaults.start,end:typeof raw.end==='string'?raw.end:defaults.end,policy:hasNewTiers&&typeof raw.policy==='string'?raw.policy:defaults.policy,tiers:[{name:'Standard',min:0,rate:Number.isSafeInteger(standard?.rate)&&standard.rate>0?standard.rate:oldRate,benefit:typeof standard?.benefit==='string'?standard.benefit:defaults.tiers[0].benefit},{name:'VIP',min:Number.isSafeInteger(vip?.min)&&vip.min>0?vip.min:defaults.tiers[1].min,rate:Number.isSafeInteger(vip?.rate)&&vip.rate>0?vip.rate:defaults.tiers[1].rate,benefit:typeof vip?.benefit==='string'?vip.benefit:defaults.tiers[1].benefit}],rewards:Array.isArray(raw.rewards)?raw.rewards:defaults.rewards}}
export const vnToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function tierFor(points:number,config:Config){return[...config.tiers].reverse().find(t=>points>=t.min)||config.tiers[0]}
export function validateConfig(input:Config){
 const c=input,date=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v));
 if(!date(c.start)||!date(c.end)||c.start>c.end)throw Error('Thời gian chương trình không hợp lệ.');
 if(typeof c.title!=='string'||!c.title.trim()||c.title.length>150||typeof c.policy!=='string'||c.policy.length>5000)throw Error('Tên hoặc nội dung chính sách không hợp lệ.');
 if(c.tiers.length!==2||c.tiers[0].name!=='Standard'||c.tiers[1].name!=='VIP'||c.tiers[0].min!==0||!Number.isSafeInteger(c.tiers[1].min)||c.tiers[1].min<1||c.tiers.some(t=>!Number.isSafeInteger(t.rate)||t.rate<1||t.rate>100000000||typeof t.benefit!=='string'||t.benefit.length>200))throw Error('Cấu hình Standard/VIP hoặc tỷ lệ quy đổi không hợp lệ.');
 if(!Array.isArray(c.rewards)||c.rewards.length>30||new Set(c.rewards.map(r=>r.id)).size!==c.rewards.length||c.rewards.some(r=>!r.id||r.id.length>60||!r.title||r.title.length>120||typeof r.description!=='string'||r.description.length>500||!['game','drink','switch'].includes(r.kind)||!Number.isSafeInteger(r.points)||r.points<1||!Number.isSafeInteger(r.stock)||r.stock<0||!date(r.start)||!date(r.end)||r.start>r.end))throw Error('Quà tặng hoặc thời gian áp dụng không hợp lệ.');
 return c;
}
export type Row=Record<string,unknown>;
const val=(r:Row,k:string)=>String(r[k]??'').trim();
export function parseRows(rows:Row[],kind:string,config:Config,known:Set<string>,existing:Map<string,{customer:string;amount:number}>,totals=new Map<string,number>(),start=config.start,end=config.end){
 const errors:string[]=[];let duplicates=0,skipped=0;const unique=new Map<string,any>();
 if(!rows.length||rows.length>10000)throw Error('File cần có từ 1 đến 10.000 dòng dữ liệu.');
 const required=kind==='customers'?['Mã khách hàng','Tên khách hàng']:['Mã hóa đơn','Mã khách hàng','Khách đã trả','Trạng thái','Thời gian(Giờ đi)'];
 if(required.some(k=>!(k in rows[0])))throw Error('Sai cấu trúc file. Thiếu cột: '+required.filter(k=>!(k in rows[0])).join(', '));
 rows.forEach((r,i)=>{
  const customer=val(r,'Mã khách hàng');
  if(!customer&&kind==='invoices'&&val(r,'Khách hàng')==='Khách lẻ'){skipped++;return}
  if(!customer||customer.length>80){errors.push(`Dòng ${i+2}: thiếu hoặc sai mã khách hàng.`);return}
  if(kind==='customers'){
   const name=val(r,'Tên khách hàng');if(!name||name.length>150){errors.push(`Dòng ${i+2}: tên khách hàng không hợp lệ.`);return}
   if(unique.has(customer)){duplicates++;if(unique.get(customer).name!==name)errors.push(`${customer}: tên không nhất quán.`);return}
   unique.set(customer,{code:customer,name,active:val(r,'Trạng thái')==='0'?0:1});return;
  }
  const code=val(r,'Mã hóa đơn');if(!code||code.length>80){errors.push(`Dòng ${i+2}: thiếu mã hóa đơn.`);return}
  if(val(r,'Trạng thái')!=='Hoàn thành'){if(existing.has(code))errors.push(`${code}: hóa đơn đã tích điểm nay đổi trạng thái; cần đối soát điều chỉnh trước khi nhập.`);else skipped++;return}
  const amount=Number(r['Khách đã trả']);let raw=r['Thời gian(Giờ đi)'];const date=raw instanceof Date?raw.toISOString().slice(0,19):String(raw??'').trim();
  if(!/^\d{4}-\d{2}-\d{2}/.test(date)||isNaN(Date.parse(date))||!Number.isSafeInteger(amount)||amount<0||amount>1000000000){errors.push(`${code}: tiền hoặc ngày không hợp lệ.`);return}
  if(date.slice(0,10)<start||date.slice(0,10)>end){skipped++;return}
  if(!known.has(customer)){errors.push(`${code}: mã ${customer} chưa có trong danh sách khách hàng.`);return}
  const prior=unique.get(code)||existing.get(code);if(prior){duplicates++;if(prior.customer!==customer||prior.amount!==amount)errors.push(`${code}: dữ liệu khác hóa đơn đã ghi nhận. Cần đối soát trước khi nhập.`);return}
  unique.set(code,{code,customer,amount,date});
 });
 const records=[...unique.values()];
 if(kind==='invoices'){const running=new Map(totals);records.sort((a,b)=>a.date.localeCompare(b.date)||a.code.localeCompare(b.code));for(const record of records){const total=running.get(record.customer)||0,tier=tierFor(total,config);record.points=Math.floor(record.amount/tier.rate);record.tier=tier.name;record.rate=tier.rate;running.set(record.customer,total+record.points)}}
 return{records,errors,duplicates,skipped,totalRows:rows.length,points:records.reduce((s,r)=>s+(r.points||0),0)};
}
