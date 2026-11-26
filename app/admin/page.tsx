import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { createStore } from "./actions";
import StoreActions from "./StoreActions";

export const dynamic = "force-dynamic";

type Store = { id: string; name: string; website_url: string | null; source_type: string; is_active: boolean; created_at: string };
const fieldStyle: React.CSSProperties = { width:"100%",padding:"12px 13px",border:"1px solid #dfe7e1",borderRadius:9,background:"#fff",color:"#17233b",outline:"none" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; updated?: string; duplicate?: string; deleted?: string; deleteBlocked?: string; error?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/login");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) return <main dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,fontFamily:"Arial,sans-serif"}}><section style={{maxWidth:480,textAlign:"center"}}><h1>ليس لديك تصريح دخول</h1><p>هذا الحساب غير مخوّل للوصول إلى لوحة إدارة Smart Deals.</p><form action="/auth/signout" method="post"><button style={{padding:"12px 20px"}}>تسجيل الخروج</button></form></section></main>;

  const [{ data: userData }, { data: stores, error: storesError }, params] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("stores").select("id,name,website_url,source_type,is_active,created_at").order("created_at", { ascending: false }),
    searchParams,
  ]);
  const storeRows = (stores ?? []) as Store[];
  const sourceLabels: Record<string,string> = { manual:"إضافة يدوية", affiliate_api:"واجهة شريك", feed:"تغذية بيانات", permitted_crawler:"جمع مصرح به" };

  return <main dir="rtl" style={{minHeight:"100vh",background:"#f4f7f5",padding:"24px 16px",fontFamily:"Arial,Tahoma,sans-serif",color:"#17233b"}}>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div><div style={{color:"#087b52",fontWeight:800,letterSpacing:1}}>SMART DEALS</div><h1 style={{margin:"8px 0",fontSize:30}}>لوحة الإدارة</h1><p style={{margin:0,color:"#68748a"}}>مرحباً، {userData.user?.email}</p></div>
        <form action="/auth/signout" method="post"><button style={{padding:"11px 17px",borderRadius:10,border:"1px solid #d8e0dc",background:"#fff"}}>تسجيل الخروج</button></form>
      </header>
      <nav style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:26}}>{["المتاجر","العروض · قريباً","الكوبونات · قريباً"].map((label,index)=><span key={label} style={{padding:"10px 16px",borderRadius:10,background:index===0?"#087b52":"#e8eeeb",color:index===0?"#fff":"#617067",fontWeight:700,fontSize:13}}>{label}</span>)}</nav>
      {params.saved&&<p style={{background:"#e5f7ed",color:"#087b52",padding:12,borderRadius:10}}>تمت إضافة المتجر بنجاح.</p>}
      {params.updated&&<p style={{background:"#e5f7ed",color:"#087b52",padding:12,borderRadius:10}}>تم تحديث حالة المتجر.</p>}\n      {params.duplicate&&<p style={{background:"#fff4df",color:"#8a5a00",padding:12,borderRadius:10}}>هذا المتجر مسجل مسبقاً، لم نضف نسخة مكررة.</p>}
      {params.deleted&&<p style={{background:"#e5f7ed",color:"#087b52",padding:12,borderRadius:10}}>تم حذف المتجر بنجاح.</p>}
      {params.deleteBlocked&&<p style={{background:"#fff4df",color:"#8a5a00",padding:12,borderRadius:10}}>لا يمكن حذف هذا المتجر لأنه مرتبط بعروض أو كوبونات. يمكنك إيقافه بدلاً من الحذف.</p>}
      {params.error&&<p style={{background:"#fff0f0",color:"#b42318",padding:12,borderRadius:10}}>{params.error}</p>}
      <section style={{background:"#fff",padding:22,borderRadius:18,marginTop:18,boxShadow:"0 8px 30px #102b1a08"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h2 style={{margin:"0 0 6px",fontSize:21}}>إضافة متجر جديد</h2><p style={{margin:0,color:"#778398",fontSize:13}}>أضف المتاجر الرسمية أو مصادر العروض المصرح بها فقط.</p></div><strong style={{color:"#087b52"}}>{storeRows.length} متجر</strong></div>
        <form action={createStore} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginTop:20}}>
          <label style={{display:"grid",gap:7,fontSize:12,color:"#566276"}}>اسم المتجر<input name="name" required maxLength={100} placeholder="اسم المتجر" style={fieldStyle}/></label>
          <label style={{display:"grid",gap:7,fontSize:12,color:"#566276"}}>رابط الموقع<input name="website_url" type="url" placeholder="https://example.com" style={fieldStyle}/></label>
          <label style={{display:"grid",gap:7,fontSize:12,color:"#566276"}}>مصدر البيانات<select name="source_type" style={fieldStyle}><option value="manual">إضافة يدوية</option><option value="affiliate_api">واجهة شريك (API)</option><option value="feed">تغذية بيانات (Feed)</option><option value="permitted_crawler">جمع مصرح به</option></select></label>
          <button type="submit" style={{alignSelf:"end",padding:13,border:0,borderRadius:10,background:"#087b52",color:"#fff",fontWeight:700}}>إضافة المتجر</button>
        </form>
      </section>
      <section style={{background:"#fff",padding:22,borderRadius:18,marginTop:18,overflowX:"auto"}}>
        <h2 style={{margin:"0 0 16px",fontSize:20}}>المتاجر المسجلة</h2>
        {storesError?<p style={{color:"#b42318"}}>تعذر تحميل المتاجر: {storesError.message}</p>:storeRows.length===0?<p style={{color:"#778398",padding:20,textAlign:"center"}}>لا توجد متاجر مسجلة بعد. أضف أول متجر من النموذج أعلاه.</p>:<table style={{width:"100%",borderCollapse:"collapse",minWidth:560,textAlign:"right",fontSize:13}}>
          <thead><tr style={{background:"#f6f8f7",color:"#667367"}}>{["المتجر","المصدر","الحالة","إجراء"].map(x=><th key={x} style={{padding:12}}>{x}</th>)}</tr></thead>
          <tbody>{storeRows.map(store=><tr key={store.id} style={{borderTop:"1px solid #edf1ee"}}>
            <td style={{padding:12}}><strong>{store.name}</strong>{store.website_url&&<a href={store.website_url} target="_blank" rel="noreferrer" style={{display:"block",color:"#087b52",fontSize:11,marginTop:4}}>{store.website_url}</a>}</td>
            <td style={{padding:12,color:"#68748a"}}>{sourceLabels[store.source_type]??store.source_type}</td>
            <td style={{padding:12}}><span style={{padding:"5px 9px",borderRadius:20,background:store.is_active?"#e5f7ed":"#f1f2f4",color:store.is_active?"#087b52":"#747b86"}}>{store.is_active?"نشط":"متوقف"}</span></td>
            <td style={{padding:12}}><StoreActions id={store.id} isActive={store.is_active}/></td>
          </tr>)}</tbody>
        </table>}
      </section>
      <p style={{fontSize:11,color:"#8a95a4",textAlign:"center",marginTop:22}}>سنكمل إدارة العروض والكوبونات بعد اختبار إدارة المتاجر.</p>
    </div>
  </main>;
}
