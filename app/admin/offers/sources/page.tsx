import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { createFeedSource, importFeedSource } from "./actions";

export const dynamic = "force-dynamic";
const field: React.CSSProperties = { width:"100%",padding:"11px 12px",border:"1px solid #dfe7e1",borderRadius:9,background:"#fff",color:"#17233b" };
const label: React.CSSProperties = { display:"grid",gap:6,fontSize:12,color:"#566276" };

export default async function FeedSourcesPage({searchParams}:{searchParams:Promise<{saved?:string;imported?:string;error?:string}>}) {
  const supabase = await createSupabaseServerClient();
  const {data: claims} = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");
  const {data: allowed} = await supabase.rpc("is_current_user_admin");
  if (allowed !== true) redirect("/admin");
  const [{data:stores},{data:sources},{data:runs},params] = await Promise.all([
    supabase.from("stores").select("id,name").eq("is_active",true).order("name"),
    supabase.from("offer_sources").select("id,name,feed_format,is_active,last_fetched_at,last_status,last_error,stores(name)").order("created_at",{ascending:false}),
    supabase.from("offer_import_runs").select("id,status,items_seen,items_added,items_updated,error,started_at,offer_sources(name)").order("started_at",{ascending:false}).limit(10),
    searchParams
  ]);
  const storeRows = stores ?? [];
  const sourceRows = sources ?? [];
  const runRows = runs ?? [];
  return <main dir="rtl" style={{minHeight:"100vh",background:"#f4f7f5",padding:"24px 16px",fontFamily:"Arial,Tahoma,sans-serif",color:"#17233b"}}>
    <div style={{maxWidth:1050,margin:"0 auto"}}>
      <Link href="/admin/offers" style={{color:"#087b52",textDecoration:"none"}}>← إدارة العروض</Link>
      <h1 style={{fontSize:28,margin:"12px 0 5px"}}>مصادر العروض التلقائية</h1>
      <p style={{color:"#68748a"}}>أضف رابط CSV أو XML أو RSS/Atom مصرحاً به من المتجر أو شبكة الشراكة. تُقرأ أعمدة اسم المنتج والرابط والصورة والوصف والسعر حسب أسماء الأعمدة المتاحة. المنتجات المستوردة تحفظ بانتظار المراجعة ولا تنشر تلقائياً.</p>
      {params.saved&&<p style={{background:"#e5f7ed",padding:12,borderRadius:9}}>تم حفظ مصدر الخلاصة.</p>}
      {params.imported!==undefined&&<p style={{background:"#e5f7ed",padding:12,borderRadius:9}}>انتهى الاستيراد. عدد العروض الجديدة: {params.imported}.</p>}
      {params.error&&<p style={{background:"#fff0f0",color:"#b42318",padding:12,borderRadius:9}}>{params.error}</p>}
      <section style={{background:"#fff",padding:22,borderRadius:16,marginTop:16}}>
        <h2 style={{marginTop:0}}>إضافة مصدر جديد</h2>
        {storeRows.length===0?<p>أضف متجراً نشطاً أولاً.</p>:<form action={createFeedSource} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
          <label style={label}>اسم المصدر<input name="name" required maxLength={120} placeholder="مثال: Amazon Affiliate Feed" style={field}/></label>
          <label style={label}>المتجر المرتبط<select name="store_id" required style={field}><option value="">اختر المتجر</option>{storeRows.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label style={label}>صيغة الخلاصة<select name="feed_format" style={field}><option value="auto">تلقائي</option><option value="rss">RSS</option><option value="atom">Atom</option><option value="xml">XML / Product Feed</option><option value="csv">CSV</option></select></label>
          <label style={{...label,gridColumn:"1 / -1"}}>رابط الخلاصة HTTPS<input name="feed_url" type="url" required placeholder="https://..." style={field}/></label>
          <button style={{padding:13,border:0,borderRadius:9,background:"#087b52",color:"#fff",fontWeight:700}}>حفظ المصدر</button>
        </form>}
      </section>
      <section style={{background:"#fff",padding:22,borderRadius:16,marginTop:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h2 style={{margin:0}}>المصادر المسجلة ({sourceRows.length})</h2><form action={importFeedSource}><button style={{padding:"10px 15px",border:0,borderRadius:9,background:"#17233b",color:"#fff"}}>تشغيل الاستيراد الآن</button></form></div>
        {sourceRows.length===0?<p style={{color:"#778398",padding:15}}>لا توجد مصادر بعد. تحتاج رابط خلاصة من حساب المتجر أو شبكة الشراكة.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"right",marginTop:14,minWidth:650}}><thead><tr>{["المصدر","المتجر","الصيغة","آخر تشغيل","الحالة","الإجراء"].map(x=><th key={x} style={{padding:10,background:"#f6f8f7"}}>{x}</th>)}</tr></thead><tbody>{sourceRows.map((s:any)=><tr key={s.id} style={{borderTop:"1px solid #edf1ee"}}><td style={{padding:10}}>{s.name}</td><td style={{padding:10}}>{s.stores?.name??"—"}</td><td style={{padding:10}}>{s.feed_format}</td><td style={{padding:10}}>{s.last_fetched_at?new Date(s.last_fetched_at).toLocaleString("ar-SA"):"لم يعمل بعد"}</td><td style={{padding:10}}>{s.last_status==="success"?"ناجح":s.last_status==="failed"?"فشل":"—"}{s.last_error&&<small style={{display:"block",color:"#b42318"}}>{s.last_error}</small>}</td><td style={{padding:10}}><form action={importFeedSource}><input type="hidden" name="source_id" value={s.id}/><button style={{padding:"7px 10px",border:0,borderRadius:7,background:"#e8f3ed",color:"#087b52"}}>استيراد</button></form></td></tr>)}</tbody></table></div>}
      </section>
      <section style={{background:"#fff",padding:22,borderRadius:16,marginTop:16}}>
        <h2 style={{marginTop:0}}>سجل آخر عمليات الاستيراد</h2>
        {runRows.length===0?<p style={{color:"#778398"}}>لا توجد عمليات بعد.</p>:runRows.map((r:any)=><div key={r.id} style={{padding:"10px 0",borderTop:"1px solid #edf1ee",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><span>{r.offer_sources?.name??"مصدر محذوف"} · {new Date(r.started_at).toLocaleString("ar-SA")}</span><span>{r.status==="success"?"نجاح":"فشل"} · تمت قراءة {r.items_seen} · جديد {r.items_added} · تحديث {r.items_updated}{r.error?" · "+r.error:""}</span></div>)}
      </section>
    </div>
  </main>;
}
