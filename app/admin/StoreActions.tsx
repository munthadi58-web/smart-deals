"use client";

import { useState } from "react";
import { deleteStore, toggleStore } from "./actions";

export default function StoreActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  async function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleting) return;
    if (!window.confirm("هل أنت متأكد من حذف المتجر نهائياً؟ إذا كان مرتبطاً بعروض أو كوبونات فلن يسمح النظام بحذفه.")) return;

    setDeleting(true);
    setDeleteMessage("");
    try {
      const result = await deleteStore(new FormData(event.currentTarget));
      if (!result.ok) {
        setDeleteMessage(result.message ?? "تعذر حذف المتجر.");
        return;
      }
      window.location.assign("/admin?deleted=1");
    } catch {
      setDeleteMessage("حدث خطأ أثناء الحذف. حدّث الصفحة للتحقق من حالة المتجر.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
      <form action={toggleStore}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="next_active" value={String(!isActive)} />
        <button style={{ padding: "8px 11px", border: "1px solid #dce5df", borderRadius: 8, background: "#fff", color: "#344256" }}>
          {isActive ? "إيقاف" : "تفعيل"}
        </button>
      </form>
      <form onSubmit={handleDelete}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={deleting} style={{ padding: "8px 11px", border: "1px solid #f1caca", borderRadius: 8, background: "#fff7f7", color: "#b42318", opacity: deleting ? 0.6 : 1 }}>
          {deleting ? "جارٍ الحذف..." : "حذف"}
        </button>
      </form>
      {deleteMessage && <span role="alert" style={{ color: "#b42318", fontSize: 12 }}>{deleteMessage}</span>}
    </div>
  );
}
