"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase-server";

async function getAdminClient() {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");
  const { data: allowed, error } = await supabase.rpc("is_current_user_admin");
  if (error || allowed !== true) redirect("/admin?error=" + encodeURIComponent("الحساب غير مخوّل لتنفيذ هذا الإجراء."));
  return supabase;
}

export async function createStore(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website_url") ?? "").trim();
  const sourceType = String(formData.get("source_type") ?? "manual");
  if (name.length < 2 || name.length > 100) redirect("/admin?error=" + encodeURIComponent("اسم المتجر يجب أن يكون بين حرفين و100 حرف."));
  if (website && !/^https?:\/\//i.test(website)) redirect("/admin?error=" + encodeURIComponent("رابط المتجر يجب أن يبدأ بـ https:// أو http://"));
  if (!["manual", "affiliate_api", "feed", "permitted_crawler"].includes(sourceType)) redirect("/admin?error=" + encodeURIComponent("نوع المصدر غير صالح."));

  const supabase = await getAdminClient();
  const { data: country, error: countryError } = await supabase.from("countries").select("id").eq("code", "SA").single();
  if (countryError || !country) redirect("/admin?error=" + encodeURIComponent("تعذر العثور على دولة السعودية."));

  // Compare normalized values in application code; avoid fragile PostgREST .or() filter parsing.
  const { data: existingStores, error: lookupError } = await supabase
    .from("stores").select("id,name,website_url").eq("country_id", country.id);
  if (lookupError) redirect("/admin?error=" + encodeURIComponent("تعذر التحقق من تكرار المتجر: " + lookupError.message));
  const normalizedName = name.toLocaleLowerCase("en").replace(/\s+/g, " ");
  const normalizedWebsite = website.replace(/\/$/, "").toLocaleLowerCase("en");
  const duplicate = (existingStores ?? []).some((store) =>
    String(store.name).toLocaleLowerCase("en").replace(/\s+/g, " ") === normalizedName ||
    (normalizedWebsite && String(store.website_url ?? "").replace(/\/$/, "").toLocaleLowerCase("en") === normalizedWebsite)
  );
  if (duplicate) redirect("/admin?duplicate=1");

  const { error } = await supabase.from("stores").insert({
    country_id: country.id,
    name,
    website_url: website || null,
    source_type: sourceType,
    is_active: true,
  });
  if (error) redirect("/admin?error=" + encodeURIComponent("تعذر إضافة المتجر: " + error.message));
  revalidatePath("/admin");
  redirect("/admin?saved=1");
}

export async function toggleStore(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextActive = String(formData.get("next_active") ?? "") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin?error=" + encodeURIComponent("معرّف المتجر غير صالح."));
  const supabase = await getAdminClient();
  const { data, error } = await supabase.from("stores").update({ is_active: nextActive }).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect("/admin?error=" + encodeURIComponent("تعذر تحديث المتجر: " + (error?.message ?? "لم يتم العثور على المتجر أو لا توجد صلاحية.")));
  revalidatePath("/admin");
  redirect("/admin?updated=1");
}

export async function deleteStore(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "معرّف المتجر غير صالح." };
  const supabase = await getAdminClient();
  const [{ count: offersCount, error: offersError }, { count: couponsCount, error: couponsError }] = await Promise.all([
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("store_id", id),
    supabase.from("coupons").select("id", { count: "exact", head: true }).eq("store_id", id),
  ]);
  if (offersError || couponsError) return { ok: false, message: "تعذر التحقق من ارتباطات المتجر قبل الحذف." };
  if ((offersCount ?? 0) > 0 || (couponsCount ?? 0) > 0) {
    return { ok: false, message: "لا يمكن حذف هذا المتجر لأنه مرتبط بعروض أو كوبونات. يمكنك إيقافه بدلاً من الحذف." };
  }
  const { data, error } = await supabase.from("stores").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, message: "تعذر حذف المتجر: " + (error?.message ?? "لم يتم العثور على المتجر.") };
  revalidatePath("/admin");
  return { ok: true };
}
