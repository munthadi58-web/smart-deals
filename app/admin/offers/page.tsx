import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { createOffer, updateOfferStatus } from "./actions";

export const dynamic = "force-dynamic";

type Store = { id: string; name: string };
type Category = { id: string; name_ar: string; name_en: string };
type Offer = {
  id: string; title: string; current_price: number | null; old_price: number | null;
  discount_percent: number | null; status: string; ends_at: string | null;
  stores: { name: string } | null; categories: { name_ar: string } | null;
};
const input: React.CSSProperties = { width:"100%",padding:"11px 12px",border:"1px solid #dfe7e1",borderRadius:9,background:"#fff",color:"#17233b" };
const label: React.CSSProperties = { display:"grid",gap:6,fontSize:12,color:"#566276" };
const statusNames: Record<string,string> = { draft:"مسودة", pending_review:"بانتظار المراجعة", published:"منشور", rejected:"مرفوض", expired:"منتهي" };

export default async function OffersAdminPage({ searchParams }: { searchParams: Promise<{ saved?:string; updated?:string; error?:string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");
  const { data: admin } = await supabase.rpc("is_current_user_admin");
  if (admin !== true) redirect("/admin?error=" + encodeURIComponent("ليس لديك تصريح دخول."));
  const [{ data: stores }, { data: categories }, { data: offers, error }, params] = await Promise.all([
    supabase.from("stores").select("id,name").eq("is_active",true).order("name"),
    supabase.from("categories").select("id,name_ar,name_en").eq("is_active",true).order("sort_order"),
    supabase.from("offers").select("id,title,current_price,old_price,discount_percent,status,ends_at,stores(name),categories(name_ar)").order("created_at",{ascending:false}),
    searchParams,
  ]);
  const storeRows = (stores ?? []) as Store[];
  const categoryRows = (categories ?? []) as Category[];
  const offerRows = (offers ?? []) as unknown as Offer[];
  return <main dir="rtl" style={{minHeight:"100vh",background:"#f4f7f5",padding:"24px 16px",fontFamily:"Arial,Tahoma,sans-serif",color:"#17233b"}}>
    <div style={{maxWidth:1150,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div><Link href="/admin" style={{color:"#087b52",textDecoration:"none",fontSize:13}}>← لوحة الإدارة</Link><h1 style={{fontSize:28,margin:"10px 0 4px"}}>إدارة العروض</h1><p style={{color:"#68748a",margin:0}}>أضف العروض واربطها بالمتاجر والفئات ثم راجعها قبل النشر.</p></div>
        <div style={{display:"flex",gap:8}}><Link href="/admin/offers/sources" style={{padding:"10px 14px",borderRadius:9,background:"#e5f7ed",color:"#087b52",textDecoration:"none"}}>مصادر تلقائية</Link><Link href="/admin" style={{padding:"10px 14px",borderRadius:9,background:"#fff",color:"#344256",textDecoration:"none"}}>المتاجر</Link><span style={{padding:"10px 14px",borderRadius:9,background:"#e8eeeb",color:"#617067"}}>الكوبونات · قريباً</span></div>
      </header>
      {params.saved&&<p style={{background:"#e5f7ed",color:"#087b52",padding:12,borderRadius:10}}>تم حفظ العرض وإرساله إلى قائمة المراجعة.</p>}
      {params.updated&&<p style={{background:"#e5f7ed",color:"#087b52",padding:12,borderRadius:10}}>تم تحديث حالة العرض.</p>}
      {params.error&&<p style={{background:"#fff0f0",color:"#b42318",padding:12,borderRadius:10}}>{params.error}</p>}
      <section style={{background:"#fff",padding:22,borderRadius:18,marginTop:18,boxShadow:"0 8px 30px #102b1a08"}}>
        <h2 style={{margin:"0 0 6px",fontSize:20}}>إضافة عرض جديد</h2>
        <p style={{margin:"0 0 18px",fontSize:13,color:"#778398"}}>كل عرض جديد يدخل أولاً في حالة «بانتظار المراجعة» ولا يظهر للجمهور قبل نشره يدوياً.</p>
        {storeRows.length===0?<p style={{color:"#b42318"}}>لا توجد متاجر نشطة. أضف متجراً أو فعّله أولاً من صفحة المتاجر.</p>:<form action={createOffer} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
          <label style={label}>عنوان العرض<input name="title" required minLength={3} maxLength={180} placeholder="مثال: خصم على سماعات..." style={input}/></label>
          <label style={label}>المتجر<select name="store_id" required style={input}><option value="">اختر المتجر</option>{storeRows.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label style={label}>الفئة<select name="category_id" style={input}><option value="">بدون فئة</option>{categoryRows.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></label>
          <label style={label}>السعر الحالي (ر.س)<input name="current_price" type="number" min="0" step="0.01" placeholder="199" style={input}/></label>
          <label style={label}>السعر السابق (ر.س)<input name="old_price" type="number" min="0" step="0.01" placeholder="299" style={input}/></label>
          <label style={label}>رابط المنتج<input name="product_url" type="url" placeholder="https://..." style={input}/></label>
          <label style={label}>رابط الصورة<input name="image_url" type="url" placeholder="https://..." style={input}/></label>
          <label style={label}>بداية العرض<input name="starts_at" type="datetime-local" style={input}/></label>
          <label style={label}>نهاية العرض<input name="ends_at" type="datetime-local" style={input}/></label>
          <label style={label}>مصدر البيانات<select name="source_type" style={input}><option value="manual">إضافة يدوية</option><option value="affiliate_api">واجهة شريك (API)</option><option value="feed">تغذية بيانات</option><option value="permitted_crawler">جمع مصرح به</option></select></label>
          <label style={{...label,gridColumn:"1 / -1"}}>وصف العرض<textarea name="description" rows={3} placeholder="تفاصيل العرض والشروط..." style={{...input,resize:"vertical"}}/></label>
          <button type="submit" style={{padding:13,border:0,borderRadius:10,background:"#087b52",color:"#fff",fontWeight:700,cursor:"pointer"}}>حفظ وإرسال للمراجعة</button>
        </form>}
      </section>
      <section style={{background:"#fff",padding:22,borderRadius:18,marginTop:18,overflowX:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><h2 style={{margin:"0 0 16px",fontSize:20}}>العروض المسجلة</h2><strong style={{color:"#087b52"}}>{offerRows.length} عرض</strong></div>
        {error?<p style={{color:"#b42318"}}>تعذر تحميل العروض: {error.message}</p>:offerRows.length===0?<p style={{textAlign:"center",padding:24,color:"#778398"}}>لا توجد عروض حالياً. أضف أول عرض من النموذج أعلاه.</p>:<table style={{width:"100%",borderCollapse:"collapse",minWidth:760,textAlign:"right",fontSize:13}}>
          <thead><tr style={{background:"#f6f8f7",color:"#667367"}}>{["العرض","المتجر","الفئة","السعر","الخصم","الحالة","الإجراء"].map(x=><th key={x} style={{padding:11}}>{x}</th>)}</tr></thead>
          <tbody>{offerRows.map(o=><tr key={o.id} style={{borderTop:"1px solid #edf1ee"}}>
            <td style={{padding:11}}><strong>{o.title}</strong>{o.ends_at&&<small style={{display:"block",color:"#778398",marginTop:4}}>ينتهي: {new Date(o.ends_at).toLocaleDateString("ar-SA")}</small>}</td>
            <td style={{padding:11}}>{o.stores?.name??"—"}</td><td style={{padding:11}}>{o.categories?.name_ar??"—"}</td>
            <td style={{padding:11,whiteSpace:"nowrap"}}>{o.current_price===null?"—":o.current_price+" ر.س"}{o.old_price!==null&&<small style={{display:"block",textDecoration:"line-through",color:"#8a95a4"}}>{o.old_price} ر.س</small>}</td>
            <td style={{padding:11}}>{o.discount_percent===null?"—":o.discount_percent+"%"}</td>
            <td style={{padding:11}}><span style={{padding:"5px 8px",borderRadius:20,background:o.status==="published"?"#e5f7ed":"#fff4df",color:o.status==="published"?"#087b52":"#8a5a00"}}>{statusNames[o.status]??o.status}</span></td>
            <td style={{padding:11}}><form action={updateOfferStatus} style={{display:"flex",gap:6,alignItems:"center"}}><input type="hidden" name="id" value={o.id}/><select name="status" defaultValue={o.status} style={{...input,width:145,padding:8}}>{Object.entries(statusNames).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select><button type="submit" style={{padding:"8px 10px",border:0,borderRadius:8,background:"#087b52",color:"#fff"}}>حفظ</button></form></td>
          </tr>)}</tbody>
        </table>}
      </section>
    </div>
  </main>;
}
