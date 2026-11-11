'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,ArrowUpRight,Crown,Gamepad2,Gift,History,Link2,LockKeyhole,ShieldCheck,Sparkles,Zap} from 'lucide-react';
import {defaults,type Config} from '@/lib/membership';
import {date,money} from './ui';

export default function Home(){
 const [cfg,setCfg]=useState<Config>(defaults);
 useEffect(()=>{fetch('/api/membership?action=config').then(r=>r.ok?r.json():Promise.reject()).then(d=>d?.config&&setCfg(d.config)).catch(()=>{})},[]);
 return <div className="landing">
  <header className="landing-header">
   <a className="landing-brand" href="/" aria-label="Gentric Members Club"><img src="/gentric-logo.png" alt="Gentric Station"/><span>GENTRIC<small>MEMBERS CLUB</small></span></a>
   <nav aria-label="Điều hướng chính"><a href="#benefits">Đặc quyền</a><a href="#member-access">Cách xem điểm</a><a className="landing-admin" href="/admin">Quản trị <ArrowUpRight size={15}/></a></nav>
  </header>
  <main>
   <section className="landing-hero">
    <div className="landing-hero-copy">
     <div className="landing-eyebrow"><span/>GENTRIC MEMBERS CLUB</div>
     <h1>Chơi hết mình.<br/><em>Đặc quyền lên ngôi.</em></h1>
     <p>Tích điểm từ mỗi cuộc vui tại Gentric, thăng hạng thành viên và mở khóa những phần quà dành riêng cho game thủ.</p>
     <div className="landing-actions"><a className="button primary" href="#member-access">Cách mở thẻ thành viên <ArrowRight size={18}/></a><a className="landing-quiet-link" href="#benefits">Khám phá chương trình</a></div>
     <div className="landing-privacy"><ShieldCheck size={18}/><span>Trang chủ không hiển thị thông tin cá nhân. Điểm và hạng chỉ có trong liên kết riêng của từng thành viên.</span></div>
    </div>
    <div className="landing-visual">
     <img src="/gaming-hero.png" alt="Tay cầm PlayStation 5 và Nintendo Switch trong không gian Gentric"/>
     <div className="landing-visual-shade"/>
     <div className="landing-platform"><Gamepad2 size={16}/> PLAYSTATION 5 <span/> NINTENDO SWITCH</div>
     <div className="private-link-card"><span><LockKeyhole size={16}/> THẺ THÀNH VIÊN RIÊNG</span><strong>membership.gentric.tech</strong><code>/member/MÃ-KHÁCH?key=••••••••</code></div>
    </div>
   </section>

   <section className="landing-program" aria-label="Thông tin chương trình">
    <div><span>CHƯƠNG TRÌNH HIỆN TẠI</span><strong>{cfg.title}</strong></div><div><span>THỜI GIAN</span><strong>{date(cfg.start)} — {date(cfg.end)}</strong></div><div><span>QUY ĐỔI</span><strong>{cfg.tiers.map(t=>t.name+' '+money(t.rate)+'/điểm').join(' · ')}</strong></div>
   </section>

   <section className="landing-section" id="benefits">
    <div className="landing-section-head"><div><div className="landing-eyebrow">PLAY. EARN. REPEAT.</div><h2>Mỗi lần trở lại, một bước tiến xa hơn.</h2></div><p>Một hành trình thành viên được thiết kế cho cộng đồng yêu PS5 và Nintendo tại Gentric.</p></div>
    <div className="landing-benefits">
     <article><span className="landing-icon red"><Zap/></span><small>01 · EARN</small><h3>Tích điểm theo hóa đơn</h3><p>Điểm được ghi nhận từ hóa đơn hoàn thành và cập nhật vào thẻ riêng của bạn.</p></article>
     <article><span className="landing-icon gold"><Crown/></span><small>02 · LEVEL UP</small><h3>Thăng hạng thành viên</h3><p>Theo dõi tổng điểm, hạng hiện tại và chặng đường đến đặc quyền tiếp theo.</p></article>
     <article><span className="landing-icon purple"><Gift/></span><small>03 · REDEEM</small><h3>Đổi quà đúng sở thích</h3><p>Dùng điểm cho giờ chơi, Nintendo, đồ uống và các phần thưởng theo từng chương trình.</p></article>
    </div>
   </section>

   <section className="member-access" id="member-access">
    <div className="member-access-copy"><div className="landing-eyebrow">PRIVATE MEMBER ACCESS</div><h2>Xem điểm qua đúng liên kết của bạn.</h2><p>Mỗi khách hàng có một URL riêng chứa mã khách hàng KiotViet và khóa bảo mật. Gentric gửi liên kết này trực tiếp; chỉ người có liên kết mới mở được thẻ.</p><div className="privacy-note"><LockKeyhole size={20}/><div><strong>Không tra cứu bằng mã khách hàng tại trang chủ</strong><span>Cách này giúp tránh người khác thử mã và xem thông tin thành viên của bạn.</span></div></div></div>
    <ol className="access-steps">
     <li><span>01</span><div><h3>Nhận liên kết từ Gentric</h3><p>Nhân viên gửi URL riêng sau khi dữ liệu thành viên được cập nhật.</p></div><Link2/></li>
     <li><span>02</span><div><h3>Mở đúng URL cá nhân</h3><code>/member/MÃ-KHÁCH?key=••••••••</code></div><ShieldCheck/></li>
     <li><span>03</span><div><h3>Xem điểm và đổi quà</h3><p>Điểm, hạng, lịch sử hóa đơn và quà đổi đều nằm trong thẻ này.</p></div><History/></li>
    </ol>
   </section>

   <section className="landing-cta"><div><Sparkles/><span>GENTRIC STATION</span><h2>More play. More possibilities.</h2><p>Mỗi trận game. Một đặc quyền mới.</p></div><div className="landing-cta-art"><img src="/gaming-hero.png" alt="Không gian gaming Gentric"/></div></section>
  </main>
  <footer className="landing-footer"><a className="landing-brand" href="/"><img src="/gentric-logo.png" alt=""/><span>GENTRIC<small>MEMBERS CLUB</small></span></a><p>© {new Date().getFullYear()} Gentric Station. Play your way.</p><span><ShieldCheck size={15}/> Thông tin thành viên được bảo vệ bằng liên kết riêng</span></footer>
 </div>
}
