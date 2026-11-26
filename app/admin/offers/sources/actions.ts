"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

async function adminClient() {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");
  const { data: allowed } = await supabase.rpc("is_current_user_admin");
  if (allowed !== true) redirect("/admin?error=" + encodeURIComponent("غير مصرح."));
  return supabase;
}

export async function createFeedSource(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const storeId = String(formData.get("store_id") ?? "");
  const feedUrl = String(formData.get("feed_url") ?? "").trim();
  const format = String(formData.get("feed_format") ?? "auto");
  if (name.length < 2 || name.length > 120) redirect("/admin/offers/sources?error=" + encodeURIComponent("اكتب اسماً صالحاً للمصدر."));
  let parsed: URL;
  try { parsed = new URL(feedUrl); } catch { redirect("/admin/offers/sources?error=" + encodeURIComponent("رابط الخلاصة غير صالح.")); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) redirect("/admin/offers/sources?error=" + encodeURIComponent("يجب أن يكون رابط الخلاصة HTTPS ومن دون بيانات دخول داخل الرابط."));
  if (!["auto","rss","atom","xml","csv"].includes(format)) redirect("/admin/offers/sources?error=" + encodeURIComponent("صيغة الخلاصة غير مدعومة."));
  const supabase = await adminClient();
  const { error } = await supabase.from("offer_sources").insert({ name, store_id: storeId, feed_url: feedUrl, feed_format: format, is_active: true });
  if (error) redirect("/admin/offers/sources?error=" + encodeURIComponent("تعذر حفظ المصدر: " + error.message));
  revalidatePath("/admin/offers/sources");
  redirect("/admin/offers/sources?saved=1");
}

export async function importFeedSource(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "");
  const supabase = await adminClient();
  const { data, error } = await supabase.functions.invoke("import-offer-feeds", { body: sourceId ? { source_id: sourceId } : {} });
  if (error) redirect("/admin/offers/sources?error=" + encodeURIComponent("تعذر تشغيل الاستيراد: " + error.message));
  revalidatePath("/admin/offers/sources");
  revalidatePath("/admin/offers");
  const added = (data?.results ?? []).reduce((sum: number, x: {added?:number}) => sum + (x.added ?? 0), 0);
  redirect("/admin/offers/sources?imported=" + added);
}
