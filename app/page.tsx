"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase-browser";
import { Search, MapPin, ChevronDown, Tag, ShoppingBag, Smartphone, Home, Shirt, Plane, Sparkles, Clock3, ArrowUpLeft, Menu, Heart, SlidersHorizontal, Globe2, BadgePercent, CarFront, Dumbbell } from "lucide-react";

type Deal = {
  id: number | string; title: string; store: string; category: string; price: number;
  oldPrice: number; discount: number; city: string; ends: string; icon: string;
  accent: string; verified: boolean;
};

const categories = [
  { name: "الكل", icon: Sparkles }, { name: "مواد غذائية", icon: ShoppingBag },
  { name: "إلكترونيات", icon: Smartphone }, { name: "المنزل والمطبخ", icon: Home },
  { name: "الأزياء", icon: Shirt }, { name: "الجمال والعناية", icon: Sparkles },
  { name: "السفر", icon: Plane }, { name: "خدمات واشتراكات", icon: Tag },
  { name: "السيارات", icon: CarFront }, { name: "رياضة وترفيه", icon: Dumbbell }, { name: "أخرى", icon: Tag },
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [city, setCity] = useState("كل السعودية");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [saved, setSaved] = useState<(number | string)[]>([]);
  const [visibleDeals, setVisibleDeals] = useState<Deal[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const supabase = createSupabaseBrowserClient();
    let active = true;

    const loadPublishedOffers = async () => {
      const { data: country, error: countryError } = await supabase
        .from("countries").select("id").eq("code", "SA").maybeSingle();

      if (!active) return;
      if (countryError || !country) {
        setVisibleDeals([]);
        setIsLive(true);
        return;
      }

      const { data: cityRows } = await supabase
        .from("cities").select("name_ar").eq("country_id", country.id)
        .eq("is_active", true).order("name_ar");
      if (active) setAvailableCities((cityRows ?? []).map((row: { name_ar: string }) => row.name_ar));

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("offers")
        .select("id,title,current_price,old_price,discount_percent,ends_at,is_verified,city:cities(name_ar),store:stores(name),category:categories(name_ar)")
        .eq("country_id", country.id)
        .eq("status", "published")
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("created_at", { ascending: false });

      if (!active) return;
      setIsLive(true);
      if (error || !data) {
        setVisibleDeals([]);
        return;
      }

      const accents = ["lavender", "peach", "mint", "rose", "blue", "sand"];
      setVisibleDeals(data.map((offer: any, index: number) => ({
        id: offer.id,
        title: offer.title,
        store: offer.store?.name ?? "متجر",
        category: offer.category?.name_ar ?? "أخرى",
        price: Number(offer.current_price ?? 0),
        oldPrice: Number(offer.old_price ?? offer.current_price ?? 0),
        discount: Number(offer.discount_percent ?? 0),
        city: offer.city?.name_ar ?? "كل السعودية",
        ends: offer.ends_at ? new Date(offer.ends_at).toLocaleDateString("ar-SA") : "مستمر",
        icon: "🏷️",
        accent: accents[index % accents.length],
        verified: Boolean(offer.is_verified),
      })));
    };

    void loadPublishedOffers();
    return () => { active = false; };
  }, []);
  const filtered = useMemo(() => visibleDeals.filter(d =>
    (category === "الكل" || d.category === category) &&
    (city === "كل السعودية" || d.city === city || d.city === "كل السعودية") &&
    `${d.title} ${d.store} ${d.category}`.includes(query.trim())
  ), [visibleDeals, query, category, city]);

  return (
    <main>
      <div className="topbar">
        <div className="container topbarInner">
          <span><Sparkles size={14}/> وفر بذكاء، واشترِ بثقة</span>
          <div className="topLinks"><span><Globe2 size={14}/> السعودية · SAR</span><span>العربية <ChevronDown size={13}/></span></div>
        </div>
      </div>
      <header className="header">
        <div className="container nav">
          <button className="iconButton mobileMenu" aria-label="القائمة"><Menu/></button>
          <a className="brand" href="#"><span className="brandMark"><Tag size={22}/></span><span>Smart<span>Deals</span><small>FIND MORE. PAY LESS.</small></span></a>
          <nav className="mainNav"><a className="active" href="#">الرئيسية</a><a href="#deals">كل العروض</a><a href="#categories">التصنيفات</a><a href="#coupons">أكواد الخصم</a></nav>
          <div className="navActions"><button className="cityButton"><MapPin size={16}/> {city}<ChevronDown size={14}/></button><button className="iconButton" aria-label="المفضلة"><Heart/></button></div>
        </div>
      </header>

      <section className="hero">
        <div className="heroGlow one"/><div className="heroGlow two"/>
        <div className="container heroContent">
          <div className="heroCopy">
            <div className="eyebrow"><span className="pulse"/> دليلك الذكي للتوفير في السعودية</div>
            <h1>كل العروض في مكان واحد.<br/><em>والتوفير يبدأ منك.</em></h1>
            <p>اكتشف التخفيضات، قارن الأسعار، واستخدم أكواد الخصم — من متاجر متعددة وبكل سهولة.</p>
            <div className="searchBox">
              <Search size={21}/>
              <input id="deal-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن منتج، متجر، أو كود خصم..." aria-label="ابحث عن العروض"/>
              <button onClick={()=>{if(query.trim())document.getElementById("search-results")?.scrollIntoView({behavior:"smooth",block:"nearest"});else document.getElementById("deal-search")?.focus();}}>ابحث الآن <ArrowUpLeft size={17}/></button>
            </div>
            {query.trim() && (
              <div id="search-results" className="searchResults" role="region" aria-live="polite" aria-label="نتائج البحث">
                <div className="searchResultsHead">
                  <b>نتائج البحث</b>
                  <span>{filtered.length} نتيجة</span>
                </div>
                {filtered.length > 0 ? filtered.slice(0, 5).map(d => (
                  <button className="searchResultItem" key={d.id} onClick={() => document.getElementById("deals")?.scrollIntoView({ behavior: "smooth" })}>
                    <span className="searchResultIcon">{d.icon}</span>
                    <span className="searchResultText"><b>{d.title}</b><small>{d.store} · {d.city}</small></span>
                    <strong>{d.price.toFixed(2)} ر.س</strong>
                  </button>
                )) : <p className="searchNoResults">لا توجد نتائج مطابقة. جرّب كلمة أخرى.</p>}
                {filtered.length > 5 && <button className="searchAllResults" onClick={() => document.getElementById("deals")?.scrollIntoView({ behavior: "smooth" })}>عرض كل النتائج ({filtered.length})</button>}
              </div>
            )}
            <div className="heroMeta"><span><BadgePercent size={15}/> عروض من مصادر متعددة</span><span><Clock3 size={15}/> تواريخ صلاحية واضحة</span><span><Heart size={15}/> احفظ ما يعجبك</span></div>
          </div>
          <div className="heroArt">
            <div className="heroOrb"><span className="orbTag">%</span><div className="orbText">SMART<br/>SAVING</div></div>
            <div className="floatCard floatOne"><span className="miniIcon">🛍️</span><div><b>فرص توفير أكثر</b><small>اكتشفها في مكان واحد</small></div></div>
            <div className="floatCard floatTwo"><span className="discountBubble">%</span><div><b>قارن قبل الشراء</b><small>قرار شراء أذكى</small></div></div>
            <div className="spark s1">✦</div><div className="spark s2">✧</div><div className="spark s3">✦</div>
          </div>
        </div>
      </section>

      <section className="container trustStrip">
        <div><span className="trustIcon"><Globe2/></span><span><b>السعودية أولاً</b><small>مصمم للسوق المحلي</small></span></div>
        <div><span className="trustIcon"><SlidersHorizontal/></span><span><b>بحث وفلاتر سهلة</b><small>اعثر على ما يناسبك</small></span></div>
        <div><span className="trustIcon"><BadgePercent/></span><span><b>عروض وكوبونات</b><small>التوفير في مكان واحد</small></span></div>
        <div><span className="trustIcon"><Clock3/></span><span><b>وضوح الصلاحية</b><small>تاريخ تحديث ومصدر العرض</small></span></div>
      </section>

      <section className="container section" id="categories">
        <div className="sectionHead"><div><span className="kicker">تسوق حسب اهتمامك</span><h2>اكتشف الأقسام</h2></div><a className="textLink" href="#deals">جميع الأقسام <ArrowUpLeft size={16}/></a></div>
        <div className="categoryGrid">
          {categories.map(({name,icon:Icon})=><button key={name} onClick={()=>{setCategory(name);document.getElementById("deals")?.scrollIntoView({behavior:"smooth"});}} className={`categoryCard ${category===name?"selected":""}`}><span className="categoryIcon"><Icon size={23}/></span><b>{name}</b><small>{name==="الكل"?"كل الفرص": "تصفح العروض"}</small></button>)}
        </div>
      </section>

      <section className="dealsSection" id="deals">
        <div className="container section">
          <div className="sectionHead"><div><span className="kicker">اختيارات تستحق نظرة</span><h2>أحدث العروض</h2><p className="sectionDesc">تصفح العروض حسب التصنيف والمدينة.</p></div><div className="filters"><select value={city} onChange={e=>setCity(e.target.value)} aria-label="اختر المدينة"><option>كل السعودية</option>{availableCities.map(name => <option key={name}>{name}</option>)}</select><button className="filterButton"><SlidersHorizontal size={16}/> تصفية</button></div></div>
          <div className="activeFilters">{category!=="الكل"&&<button onClick={()=>setCategory("الكل")}>{category} ×</button>}{query&&<button onClick={()=>setQuery("")}>بحث: {query} ×</button>}</div>
          <div className="dealGrid">
            {filtered.map(d=><article className="dealCard" key={d.id}>
              <div className={`dealImage ${d.accent}`}><span className="discountLabel">خصم {d.discount}%</span><button className={`saveButton ${saved.includes(d.id)?"saved":""}`} onClick={()=>setSaved(s=>s.includes(d.id)?s.filter(x=>x!==d.id):[...s,d.id])} aria-label="حفظ العرض"><Heart size={18} fill={saved.includes(d.id)?"currentColor":"none"}/></button><span className="productEmoji">{d.icon}</span></div>
              <div className="dealInfo"><div className="storeName">{d.store}<span className="unverified">{isLive ? (d.verified ? "تم التحقق" : "عرض منشور") : "بيانات تجريبية"}</span></div><h3>{d.title}</h3><div className="priceRow"><b>{d.price.toFixed(2)} <small>ر.س</small></b><del>{d.oldPrice.toFixed(2)} ر.س</del></div><div className="dealFoot"><span><MapPin size={13}/>{d.city}</span><span><Clock3 size={13}/>{d.ends}</span></div><button className="dealButton" onClick={()=>alert("هذا عرض تجريبي للتصميم فقط. لن يتم تحويلك إلى متجر قبل ربط مصدر حقيقي.")}>تفاصيل العرض <ArrowUpLeft size={16}/></button></div>
            </article>)}
          </div>
          {filtered.length===0&&<div className="empty">{!isLive ? "نعمل على تجهيز العروض الحقيقية لهذه المنطقة. عُد قريباً." : query.trim() || category!=="الكل" || city!=="كل السعودية" ? "لا توجد نتائج مطابقة. جرّب تغيير كلمة البحث أو التصنيف." : "لا توجد عروض منشورة حالياً. تابعنا لاكتشاف العروض الجديدة."}</div>}
          <p className="demoNotice">تعرض هذه الصفحة العروض المنشورة في قاعدة البيانات فقط. لا نعرض أسعاراً تجريبية على أنها عروض حقيقية.</p>
        </div>
      </section>

      <section className="container couponBanner" id="coupons"><div className="couponSymbol"><Tag size={34}/></div><div><span className="kicker">قريباً في Smart Deals</span><h2>كود خصمك القادم في مكان واحد</h2><p>نجمع أكواد الخصم ونوضح شروطها وتاريخ صلاحيتها بعد التحقق منها.</p></div><span className="couponPill">COUPONS <b>%</b></span></section>

      <footer><div className="container footerInner"><a className="brand footerBrand" href="#"><span className="brandMark"><Tag size={20}/></span><span>Smart<span>Deals</span><small>FIND MORE. PAY LESS.</small></span></a><p>منصة لاكتشاف العروض والتوفير بذكاء.</p><span>© 2026 Smart Deals. جميع الحقوق محفوظة.</span></div></footer>
    </main>
  );
}
