import {redirect} from 'next/navigation';
import {database} from '@/lib/database';
import {CreditCard,ShieldCheck} from 'lucide-react';
export const dynamic='force-dynamic';

export default async function PhysicalCard({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 const card=await database.prepare("SELECT p.card_code,p.status,c.code,c.token member_token,c.active FROM physical_cards p LEFT JOIN customers c ON p.customer=c.code WHERE p.token=?").bind(token).first<any>();
 if(card?.status==='active'&&card.code&&Number(card.active)===1)redirect('/member/'+encodeURIComponent(card.code)+'?key='+encodeURIComponent(card.member_token));
 const disabled=card?.status==='disabled';
 return <main className="card-gate"><img src="/gentric-logo.png" alt="Gentric Station"/><span className="icon-tile red"><CreditCard/></span><div className="eyebrow">GENTRIC PHYSICAL MEMBER CARD</div><h1>{disabled?'Thẻ này đã được khóa':'Thẻ chưa được kích hoạt'}</h1><p>{disabled?'Vui lòng mang thẻ đến quầy Gentric để được hỗ trợ.':'Nhân viên Gentric sẽ gán thẻ này vào mã khách hàng của bạn tại quầy.'}</p>{card?.card_code&&<code>{card.card_code}</code>}<small><ShieldCheck size={14}/> QR được bảo vệ và có thể quản lý tại quầy</small></main>
}
