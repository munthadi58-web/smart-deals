"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

async function getAdminClient() {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");
  const { data: allowed, error } = await supabase.rpc("is_current_user_admin");
  if (error || allowed !== true) redirect("/admin?error=" + encodeURIComponent("الحساب غير مخوّل لتنفيذ هذا الإجراء."));
  return supabase;
}

function fail(message: string): never {
  redirect("/admin/offers?error=" + encodeURIComponent(message));
}

export async function createOffer(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const storeId = String(formData.get("store_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const productUrl = String(formData.get("product_url") ?? "").trim();
  const currentRaw = String(formData.get("current_price") ?? "").trim();
  const oldRaw = String(formData.get("old_price") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAt = String(formData.get("ends_at") ?? "").trim();
  const sourceType = String(formData.get("source_type") ?? "manual");
  if (title.length < 3 || title.length > 180) fail("عنوان العرض يجب أن يكون بين 3 و180 حرفاً.");
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) fail("اختر متجراً صالحاً.");
  if (categoryId && !/^[0-9a-f-]{36}$/i.test(categoryId)) fail("الفئة المختارة غير صالحة.");
  for (const [label, value] of [["رابط الصورة", imageUrl], ["رابط المنتج", productUrl]] as const) {
    if (value && !/^https?:\/\//i.test(value)) fail(label + " يجب أن يبدأ بـ http:// أو https://");
  }
  const currentPrice = currentRaw ? Number(currentRaw) : null;
  const oldPrice = oldRaw ? Number(oldRaw) : null;
  if (currentRaw && (!Number.isFinite(currentPrice) || currentPrice! < 0)) fail("السعر الحالي غير صالح.");
  if (oldRaw && (!Number.isFinite(oldPrice) || oldPrice! < 0)) fail("السعر السابق غير صالح.");
  if (currentPrice !== null && oldPrice !== null && oldPrice <= currentPrice) fail("السعر السابق يجب أن يكون أكبر من السعر الحالي.");
  if (!["manual", "affiliate_api", "feed", "permitted_crawler"].includes(sourceType)) fail("مصدر العرض غير صالح.");
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) fail("تاريخ انتهاء العرض يجب أن يكون بعد تاريخ بدايته.");

  const supabase = await getAdminClient();
  const [{ data: country }, { data: store }] = await Promise.all([
    supabase.from("countries").select("id").eq("code", "SA").single(),
    supabase.from("stores").select("id").eq("id", storeId).eq("is_active", true).maybeSingle(),
  ]);
  if (!country) fail("تعذر العثور على إعداد السعودية.");
  if (!store) fail("المتجر غير موجود أو متوقف. فعّل المتجر أولاً.");
  const discount = currentPrice !== null && oldPrice !== null
    ? Math.round(((oldPrice - currentPrice) / oldPrice) * 10000) / 100
    : null;
  const { error } = await supabase.from("offers").insert({
    country_id: country.id,
    store_id: storeId,
    category_id: categoryId || null,
    title,
    description: description || null,
    image_url: imageUrl || null,
    product_url: productUrl || null,
    current_price: currentPrice,
    old_price: oldPrice,
    discount_percent: discount,
    starts_at: startsAt ? new Date(startsAt).toISOString() : null,
    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    source_type: sourceType,
    status: "pending_review",
    is_verified: false,
  });
  if (error) fail("تعذر حفظ العرض: " + error.message);
  revalidatePath("/admin/offers");
  revalidatePath("/");
  redirect("/admin/offers?saved=1");
}

export async function updateOfferStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) fail("معرّف العرض غير صالح.");
  if (!["draft", "pending_review", "published", "rejected", "expired"].includes(status)) fail("حالة العرض غير صالحة.");
  const supabase = await getAdminClient();
  const update = status === "published"
    ? { status, is_verified: true, last_checked_at: new Date().toISOString() }
    : { status, is_verified: false };
  const { data, error } = await supabase.from("offers").update(update).eq("id", id).select("id").maybeSingle();
  if (error || !data) fail("تعذر تحديث حالة العرض: " + (error?.message ?? "العرض غير موجود."));
  revalidatePath("/admin/offers");
  revalidatePath("/");
  redirect("/admin/offers?updated=1");
}
