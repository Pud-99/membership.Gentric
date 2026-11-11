import assert from 'node:assert/strict';import fs from 'node:fs';import * as XLSX from 'xlsx';import {defaults,parseRows,validateConfig,tierFor} from '../lib/membership.ts';
const read=name=>{const w=XLSX.read(fs.readFileSync('../'+name),{type:'buffer',cellDates:true});return XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]],{defval:''})};
const cs=parseRows(read('DanhSachKhachHang_KV28102026-153222-623.xlsx'),'customers',defaults,new Set(),new Map(),new Map());assert.equal(cs.records.length,1827);assert.equal(cs.errors.length,0);
const known=new Set(cs.records.map(c=>c.code)),rows=read('DanhSachChiTietHoaDon_KV28102026-153320-496.xlsx');
const p=parseRows(rows,'invoices',defaults,known,new Map(),new Map());assert.equal(p.errors.length,0);assert.equal(p.records.find(r=>r.code==='HD002482').points,74);
const again=parseRows(rows,'invoices',defaults,known,new Map(p.records.map(r=>[r.code,r])),new Map());assert.equal(again.records.length,0);assert.equal(again.points,0);
const changed=structuredClone(rows);changed[0]['Khách đã trả']=999999;assert(parseRows(changed,'invoices',defaults,known,new Map(p.records.map(r=>[r.code,r])),new Map()).errors.length>0);
assert(parseRows(rows,'invoices',defaults,new Set(),new Map(),new Map()).errors.length>0);
const outside=parseRows(rows,'invoices',{...defaults,start:'2027-01-01',end:'2027-12-31'},known,new Map(),new Map());assert.equal(outside.records.length,0);
const canceled=structuredClone(rows);canceled.forEach(r=>r['Trạng thái']='Đã hủy');assert.equal(parseRows(canceled,'invoices',defaults,known,new Map(),new Map()).records.length,0);
assert.throws(()=>validateConfig({...defaults,tiers:defaults.tiers.map((t,i)=>i?{...t,rate:0}:t)}));assert.throws(()=>validateConfig({...defaults,tiers:[]}));assert.equal(tierFor(500,defaults).name,'VIP');assert.equal(tierFor(199,defaults).name,'Standard');
const vipRow=[{'Mã hóa đơn':'VIP-001','Mã khách hàng':'VIP-CUSTOMER','Thời gian(Giờ đi)':'2026-10-28T10:00:00','Khách đã trả':150000,'Trạng thái':'Hoàn thành'}];const vip=parseRows(vipRow,'invoices',defaults,new Set(['VIP-CUSTOMER']),new Map(),new Map([['VIP-CUSTOMER',500]]));assert.equal(vip.records[0].tier,'VIP');assert.equal(vip.records[0].points,10);
console.log(JSON.stringify({passed:10,customers:cs.records.length,invoiceRows:rows.length,uniqueInvoices:p.records.length,totalPoints:p.points,duplicateRows:p.duplicates}));

