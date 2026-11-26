import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/login");

  const { data: isAdmin, error } = await supabase.rpc("is_current_user_admin");
  if (error || isAdmin !== true) {
    return (
      <main dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,fontFamily:"Arial,sans-serif"}}>
        <section style={{maxWidth:480,textAlign:"center"}}>
          <h1>ليس لديك تصريح دخول</h1>
          <p>هذا الحساب غير مخوّل للوصول إلى لوحة إدارة Smart Deals.</p>
          <form action="/auth/signout" method="post"><button style={{padding:"12px 20px"}}>تسجيل الخروج</button></form>
        </section>
      </main>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  return (
    <main dir="rtl" style={{minHeight:"100vh",background:"#f5f7f6",padding:24,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1000,margin:"0 auto"}}>
        <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div><p style={{color:"#087b52",fontWeight:700}}>SMART DEALS</p><h1>لوحة الإدارة</h1><p>مرحباً، {userData.user?.email}</p></div>
          <form action="/auth/signout" method="post"><button style={{padding:"10px 16px",borderRadius:10,border:"1px solid #d5ded8",background:"#fff"}}>تسجيل الخروج</button></form>
        </header>
        <section style={{background:"#fff",padding:24,borderRadius:18,marginTop:24}}>
          <h2>تم التحقق من صلاحية المسؤول</h2>
          <p>بوابة الإدارة محمية. سنضيف إدارة المتاجر والعروض والكوبونات ومراجعة النشر في الخطوة التالية.</p>
        </section>
      </div>
    </main>
  );
}
