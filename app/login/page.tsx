"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول. تحقق من البيانات.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f5f7f6"}}>
      <form onSubmit={handleSubmit} style={{width:"100%",maxWidth:420,background:"#fff",padding:32,borderRadius:20,boxShadow:"0 12px 40px #10251b12",display:"grid",gap:16}}>
        <div style={{fontSize:13,color:"#13865b",fontWeight:700}}>SMART DEALS</div>
        <h1 style={{margin:0,fontSize:28}}>دخول لوحة الإدارة</h1>
        <p style={{margin:"0 0 8px",color:"#647067"}}>سجّل الدخول بحساب المسؤول المعتمد.</p>
        <label>البريد الإلكتروني<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} style={field}/></label>
        <label>كلمة المرور<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={field}/></label>
        {error && <p role="alert" style={{color:"#b42318",margin:0}}>{error}</p>}
        <button disabled={loading} style={{border:0,borderRadius:12,padding:14,background:"#087b52",color:"#fff",fontWeight:700,fontSize:16,opacity:loading?.7:1}}>{loading?"جارٍ الدخول...":"تسجيل الدخول"}</button>
      </form>
    </main>
  );
}

const field: React.CSSProperties = {display:"block",width:"100%",boxSizing:"border-box",marginTop:8,padding:13,border:"1px solid #d9e1dc",borderRadius:10,fontSize:16};
