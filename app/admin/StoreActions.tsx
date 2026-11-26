"use client";

import { deleteStore, toggleStore } from "./actions";

export default function StoreActions({ id, isActive }: { id: string; isActive: boolean }) {
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      <form action={toggleStore}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="next_active" value={String(!isActive)} />
        <button style={{ padding: "8px 11px", border: "1px solid #dce5df", borderRadius: 8, background: "#fff", color: "#344256" }}>
          {isActive ? "إيقاف" : "تفعيل"}
        </button>
      </form>
      <form action={deleteStore} onSubmit={(event) => {
        if (!window.confirm("هل أنت متأكد من حذف المتجر نهائياً؟ إذا كان مرتبطاً بعروض أو كوبونات فلن يسمح النظام بحذفه.")) event.preventDefault();
      }}>
        <input type="hidden" name="id" value={id} />
        <button style={{ padding: "8px 11px", border: "1px solid #f1caca", borderRadius: 8, background: "#fff7f7", color: "#b42318" }}>حذف</button>
      </form>
    </div>
  );
}
