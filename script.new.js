import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  Minus,
  Moon,
  Plus,
  Search,
  ShoppingCart,
  Sun,
  Trash2,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAfllte-D_I3h3TwBaiSL4KVfWrCSVh9ro",
  authDomain: "sustore-63266.firebaseapp.com",
  projectId: "sustore-63266",
  storageBucket: "sustore-63266.firebasestorage.app",
  messagingSenderId: "684651914850",
  appId: "1:684651914850:web:f3df09e5caf6e50e9e533b",
  measurementId: "G-X3K7XGYPRD",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "sustore-63266-prod";

const DEFAULT_SETTINGS = {
  storeName: "Sustore",
  seoTitle: "Tienda Online",
  seoDescription: "Tu tienda online de confianza.",
  seoKeywords: "tienda online, productos, comprar",
  themeColor: "#f97316",
  categories: [],
};

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  try {
    return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  } catch {
    return `$${n.toFixed(0)}`;
  }
}

function applySeo(settings) {
  const title = settings?.seoTitle || settings?.storeName || DEFAULT_SETTINGS.seoTitle;
  document.title = title;

  const metaDesc = document.getElementById("meta-description");
  if (metaDesc) metaDesc.setAttribute("content", settings?.seoDescription || DEFAULT_SETTINGS.seoDescription);

  const metaKey = document.getElementById("meta-keywords");
  if (metaKey) metaKey.setAttribute("content", settings?.seoKeywords || DEFAULT_SETTINGS.seoKeywords);

  const metaTheme = document.getElementById("meta-theme-color");
  if (metaTheme) metaTheme.setAttribute("content", settings?.themeColor || DEFAULT_SETTINGS.themeColor);
}

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    const raw = localStorage.getItem(key);
    return raw == null ? initialValue : safeJsonParse(raw, initialValue);
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

function Loading() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-slate-800 animate-spin" style={{ borderTopColor: "#f97316" }} />
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-black bg-orange-500 text-white">
      {children}
    </span>
  );
}

function Header({ darkMode, setDarkMode, settings, view, setView, searchQuery, setSearchQuery, cartCount }) {
  return (
    <header className={`sticky top-0 z-50 border-b ${darkMode ? "bg-[#050505] border-slate-900" : "bg-white border-slate-200"}`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => setView("store")}
          className={`font-black tracking-tight text-lg sm:text-xl ${darkMode ? "text-white" : "text-slate-900"}`}
        >
          {settings?.storeName || DEFAULT_SETTINGS.storeName}
        </button>

        <div className="flex-1" />

        {view === "store" && (
          <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border ${darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <Search className={`w-4 h-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos…"
              className={`w-72 bg-transparent outline-none text-sm font-medium ${darkMode ? "text-white placeholder-slate-600" : "text-slate-900 placeholder-slate-400"}`}
            />
          </div>
        )}

        <button
          onClick={() => setDarkMode((v) => !v)}
          className={`p-2 rounded-xl border transition ${darkMode ? "bg-slate-950 border-slate-800 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"}`}
          aria-label="Cambiar tema"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setView("cart")}
          className={`relative p-2 rounded-xl border transition ${darkMode ? "bg-slate-950 border-slate-800 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"}`}
          aria-label="Carrito"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && <span className="absolute -top-2 -right-2"><Badge>{cartCount}</Badge></span>}
        </button>
      </div>
    </header>
  );
}

function ProductCard({ darkMode, product, onAdd }) {
  return (
    <div className={`rounded-3xl border overflow-hidden transition ${darkMode ? "bg-[#0a0a0a] border-slate-900 hover:border-orange-500/30" : "bg-white border-slate-200 hover:border-orange-400/40"}`}>
      <div className={`aspect-square w-full flex items-center justify-center ${darkMode ? "bg-white" : "bg-slate-50"}`}>
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-contain p-6" />
        ) : (
          <div className="text-slate-400 text-sm font-bold">Sin imagen</div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className={`font-black truncate ${darkMode ? "text-white" : "text-slate-900"}`}>{product.name || "Producto"}</h3>
            <p className="text-xs text-slate-500 mt-1">{product.category || "Sin categoría"}</p>
          </div>
          <div className={`font-black ${darkMode ? "text-orange-400" : "text-orange-600"}`}>{formatMoney(product.price)}</div>
        </div>
        <button
          onClick={onAdd}
          className={`mt-4 w-full py-3 rounded-2xl font-black text-sm transition border ${darkMode ? "bg-orange-600 text-white border-orange-500 hover:bg-orange-500" : "bg-orange-500 text-white border-orange-400 hover:bg-orange-600"}`}
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}

function StoreView({ darkMode, settings, products, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, onAdd }) {
  const categories = useMemo(() => {
    const fromSettings = Array.isArray(settings?.categories) ? settings.categories : [];
    const fromProducts = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    const combined = [...fromSettings, ...fromProducts].map((c) => String(c).trim()).filter(Boolean);
    return Array.from(new Set(combined));
  }, [products, settings?.categories]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (p.isActive === false) return false;
      const matchesText = !q || String(p.name || "").toLowerCase().includes(q);
      const matchesCat = !selectedCategory || (p.category || "") === selectedCategory;
      return matchesText && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 pb-24 w-full">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-4xl sm:text-5xl font-black tracking-tighter ${darkMode ? "text-white" : "text-slate-900"}`}>
            {settings?.storeName || DEFAULT_SETTINGS.storeName}
          </h1>
          <p className="text-slate-500 mt-2">Catálogo de productos</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className={`flex md:hidden items-center gap-2 px-4 py-3 rounded-2xl border ${darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <Search className={`w-4 h-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos…"
              className={`w-full bg-transparent outline-none text-sm font-medium ${darkMode ? "text-white placeholder-slate-600" : "text-slate-900 placeholder-slate-400"}`}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-4 py-3 rounded-2xl border font-bold text-sm outline-none ${darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`p-12 rounded-[2.5rem] border text-center ${darkMode ? "bg-slate-950 border-slate-900 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
          No hay productos para mostrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <ProductCard key={p.id} darkMode={darkMode} product={p} onAdd={() => onAdd(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CartView({ darkMode, items, total, onBack, onInc, onDec, onRemove, onGoCheckout }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-24 w-full">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className={`p-3 rounded-2xl border transition ${darkMode ? "bg-slate-950 border-slate-800 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className={`text-3xl sm:text-4xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>Carrito</h1>
      </div>

      {items.length === 0 ? (
        <div className={`p-12 rounded-[2.5rem] border text-center ${darkMode ? "bg-slate-950 border-slate-900 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
          Tu carrito está vacío.
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {items.map(({ product, qty }) => (
              <div
                key={product.id}
                className={`p-4 rounded-[2rem] border flex gap-4 ${darkMode ? "bg-[#0a0a0a] border-slate-900" : "bg-white border-slate-200"}`}
              >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${darkMode ? "bg-white" : "bg-slate-50"} overflow-hidden`}>
                  {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-contain p-2" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`font-black truncate ${darkMode ? "text-white" : "text-slate-900"}`}>{product.name || "Producto"}</div>
                      <div className="text-xs text-slate-500 mt-1">{formatMoney(product.price)}</div>
                    </div>
                    <button
                      onClick={() => onRemove(product.id)}
                      className={`p-2 rounded-xl border transition ${darkMode ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-red-400" : "bg-white border-slate-200 text-slate-500 hover:text-red-600"}`}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => onDec(product.id)}
                      className={`p-2 rounded-xl border transition ${darkMode ? "bg-slate-950 border-slate-800 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"}`}
                      aria-label="Restar"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className={`min-w-12 text-center font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{qty}</div>
                    <button
                      onClick={() => onInc(product.id)}
                      className={`p-2 rounded-xl border transition ${darkMode ? "bg-slate-950 border-slate-800 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"}`}
                      aria-label="Sumar"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`p-6 rounded-[2rem] border h-fit ${darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200"}`}>
            <div className={`text-lg font-black ${darkMode ? "text-white" : "text-slate-900"}`}>Resumen</div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-slate-500 text-sm font-bold">Total</div>
              <div className={`text-2xl font-black ${darkMode ? "text-orange-400" : "text-orange-600"}`}>{formatMoney(total)}</div>
            </div>
            <button
              onClick={onGoCheckout}
              className={`mt-6 w-full py-3 rounded-2xl font-black text-sm transition border ${darkMode ? "bg-orange-600 text-white border-orange-500 hover:bg-orange-500" : "bg-orange-500 text-white border-orange-400 hover:bg-orange-600"}`}
            >
              Ir a pagar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Placeholder({ darkMode, title, onBack }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24 w-full">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className={`p-3 rounded-2xl border transition ${darkMode ? "bg-slate-950 border-slate-800 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className={`text-3xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{title}</h1>
      </div>
      <div className={`p-10 rounded-[2rem] border ${darkMode ? "bg-slate-950 border-slate-900 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
        Esta sección se está reconstruyendo. La tienda y el carrito ya están operativos.
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState("store");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [darkMode, setDarkMode] = useLocalStorageState("sustore_dark_mode", true);
  const [cart, setCart] = useLocalStorageState("sustore_cart_v1", []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth).catch(() => {});
    });

    const productsRef = collection(db, "artifacts", appId, "public", "data", "products");
    const unsubProducts = onSnapshot(
      productsRef,
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {
        setProducts([]);
      }
    );

    const settingsRef = collection(db, "artifacts", appId, "public", "data", "settings");
    const unsubSettings = onSnapshot(
      settingsRef,
      (snap) => {
        const configDoc = snap.docs.find((d) => d.id === "config");
        const first = configDoc || snap.docs[0];
        const data = first ? first.data() : {};
        const merged = {
          ...DEFAULT_SETTINGS,
          ...data,
          categories: Array.isArray(data?.categories) ? data.categories : DEFAULT_SETTINGS.categories,
        };
        setSettings(merged);
        setSettingsLoaded(true);
        applySeo(merged);
      },
      () => {
        setSettings(DEFAULT_SETTINGS);
        setSettingsLoaded(true);
        applySeo(DEFAULT_SETTINGS);
      }
    );

    return () => {
      unsubAuth();
      unsubProducts();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", Boolean(darkMode));
    document.body.style.backgroundColor = darkMode ? "#050505" : "#ffffff";
    document.body.style.color = darkMode ? "#e2e8f0" : "#0f172a";
  }, [darkMode]);

  const cartCount = useMemo(() => cart.reduce((sum, it) => sum + (Number(it.qty) || 0), 0), [cart]);

  const items = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return cart
      .map((it) => {
        const product = byId.get(it.productId);
        if (!product) return null;
        return { product, qty: Math.max(1, Number(it.qty) || 1) };
      })
      .filter(Boolean);
  }, [cart, products]);

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.product.price) || 0) * (Number(it.qty) || 0), 0);
  }, [items]);

  function addToCart(product) {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === product.id);
      if (idx === -1) return [...prev, { productId: product.id, qty: 1 }];
      return prev.map((x, i) => (i === idx ? { ...x, qty: (Number(x.qty) || 0) + 1 } : x));
    });
  }

  function inc(productId) {
    setCart((prev) => prev.map((x) => (x.productId === productId ? { ...x, qty: (Number(x.qty) || 0) + 1 } : x)));
  }

  function dec(productId) {
    setCart((prev) =>
      prev
        .map((x) => (x.productId === productId ? { ...x, qty: (Number(x.qty) || 0) - 1 } : x))
        .filter((x) => (Number(x.qty) || 0) > 0)
    );
  }

  function remove(productId) {
    setCart((prev) => prev.filter((x) => x.productId !== productId));
  }

  const content = (() => {
    if (!settingsLoaded) return <Loading />;

    if (view === "store") {
      return (
        <StoreView
          darkMode={darkMode}
          settings={settings}
          products={products}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onAdd={addToCart}
        />
      );
    }

    if (view === "cart") {
      return (
        <CartView
          darkMode={darkMode}
          items={items}
          total={total}
          onBack={() => setView("store")}
          onInc={inc}
          onDec={dec}
          onRemove={remove}
          onGoCheckout={() => setView("checkout")}
        />
      );
    }

    if (view === "checkout") return <Placeholder darkMode={darkMode} title="Checkout" onBack={() => setView("cart")} />;
    if (view === "login") return <Placeholder darkMode={darkMode} title="Login" onBack={() => setView("store")} />;
    if (view === "register") return <Placeholder darkMode={darkMode} title="Registro" onBack={() => setView("store")} />;
    if (view === "admin") return <Placeholder darkMode={darkMode} title="Admin" onBack={() => setView("store")} />;

    return <Placeholder darkMode={darkMode} title="Sección" onBack={() => setView("store")} />;
  })();

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? "bg-[#050505]" : "bg-white"}`}>
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        settings={settings}
        view={view}
        setView={setView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cartCount={cartCount}
      />
      <main className="flex-1">{content}</main>
      <footer className={`border-t py-10 ${darkMode ? "border-slate-900 text-slate-500" : "border-slate-200 text-slate-500"}`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 text-xs font-bold uppercase tracking-widest">
          {settings?.storeName || DEFAULT_SETTINGS.storeName}
        </div>
      </footer>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<App />);
