"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase-server";

async function getAdminClient() {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");
  const { data: allowed, error } = await supabase.rpc("is_current_user_admin");
  if (error || allowed !== true) throw new Error("غير مصرح بتنفيذ هذا الإجراء.");
  return supabase;
}

export async function createStore(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website_url") ?? "").trim();
  const sourceType = String(formData.get("source_type") ?? "manual");
  if (name.length < 2 || name.length > 100) throw new Error("اسم المتجر يجب أن يكون بين حرفين و100 حرف.");
  if (website && !/^https?:\/\//i.test(website)) throw new Error("رابط المتجر يجب أن يبدأ بـ https:// أو http://");
  if (!["manual", "affiliate_api", "feed", "permitted_crawler"].includes(sourceType)) throw new Error("نوع المصدر غير صالح.");

  const supabase = await getAdminClient();
  const { data: country, error: countryError } = await supabase.from("countries").select("id").eq("code", "SA").single();
  if (countryError || !country) throw new Error("تعذر العثور على دولة السعودية في قاعدة البيانات.");

  const { data: existingStore, error: duplicateCheckError } = await supabase.from("stores").select("id").eq("country_id", country.id).or(`name.ilike.${name},website_url.eq.${website || "__no_url__"}`).limit(1).maybeSingle();
  if (duplicateCheckError) throw new Error("تعذر التحقق من وجود المتجر مسبقاً: " + duplicateCheckError.message);
  if (existingStore) redirect("/admin?tab=stores&duplicate=1");

  const { error } = await supabase.from("stores").insert({
    country_id: country.id,
    name,
    website_url: website || null,
    source_type: sourceType,
    is_active: true,
  });
  if (error) throw new Error("تعذر إضافة المتجر: " + error.message);
  revalidatePath("/admin");
  redirect("/admin?tab=stores&saved=1");
}

export async function toggleStore(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextActive = String(formData.get("next_active") ?? "") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("معرّف المتجر غير صالح.");
  const supabase = await getAdminClient();
  const { error } = await supabase.from("stores").update({ is_active: nextActive }).eq("id", id);
  if (error) throw new Error("تعذر تحديث المتجر: " + error.message);
  revalidatePath("/admin");
  redirect("/admin?tab=stores&updated=1");
}
