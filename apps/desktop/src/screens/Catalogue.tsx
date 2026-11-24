import { formatGHS } from '@extramile/core';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CONDITIONS,
  createBrand,
  createCategory,
  createProduct,
  createVariant,
  deleteProductImage,
  imageUrl,
  listBrands,
  listCategories,
  listProducts,
  setProductActive,
  updateVariant,
  uploadProductImage,
  type Brand,
  type Category,
  type Condition,
  type ProductRow,
} from '../lib/catalogue';

export function Catalogue() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [c, b, p] = await Promise.all([listCategories(), listBrands(), listProducts()]);
    setCategories(c);
    setBrands(b);
    setProducts(p);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const report = (fn: () => Promise<void>) => async () => {
    setMessage(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed.');
    }
  };

  return (
    <main style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem', maxWidth: '60rem' }}>
      <h1 style={{ margin: 0 }}>Catalogue</h1>
      {message && <p className="error">{message}</p>}

      <TaxonomyBar
        categories={categories}
        brands={brands}
        onAddCategory={(n) => report(() => createCategory(n))()}
        onAddBrand={(n) => report(() => createBrand(n))()}
      />

      <NewProductForm
        categories={categories}
        brands={brands}
        onCreate={(p, v) =>
          report(async () => {
            const id = await createProduct(p);
            if (v) await createVariant(id, v.sku, v.priceCedis, v.stock);
          })()
        }
      />

      <section style={{ display: 'grid', gap: '.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Products ({products.length})</h2>
        {products.length === 0 && <p className="muted">No products yet — create one above.</p>}
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onToggleActive={() => report(() => setProductActive(p.id, !p.is_active))()}
            onAddVariant={(sku, price, stock) =>
              report(() => createVariant(p.id, sku, price, stock))()
            }
            onSaveVariant={(id, price, stock) =>
              report(() => updateVariant(id, { priceCedis: price, stock }))()
            }
            onToggleVariant={(id, active) =>
              report(() => updateVariant(id, { is_active: active }))()
            }
            onUploadImage={(file) => report(() => uploadProductImage(p.id, file))()}
            onDeleteImage={(id, path) => report(() => deleteProductImage(id, path))()}
          />
        ))}
      </section>
    </main>
  );
}

function TaxonomyBar({
  categories,
  brands,
  onAddCategory,
  onAddBrand,
}: {
  categories: Category[];
  brands: Brand[];
  onAddCategory: (name: string) => void;
  onAddBrand: (name: string) => void;
}) {
  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  return (
    <section
      style={{ display: 'grid', gap: '.5rem', gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}
    >
      <div style={{ display: 'grid', gap: '.35rem' }}>
        <span className="muted">Categories ({categories.length})</span>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <input
            className="input"
            placeholder="New category"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn secondary"
            disabled={!cat.trim()}
            onClick={() => {
              onAddCategory(cat.trim());
              setCat('');
            }}
          >
            Add
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gap: '.35rem' }}>
        <span className="muted">Brands ({brands.length})</span>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <input
            className="input"
            placeholder="New brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn secondary"
            disabled={!brand.trim()}
            onClick={() => {
              onAddBrand(brand.trim());
              setBrand('');
            }}
          >
            Add
          </button>
        </div>
      </div>
    </section>
  );
}

function NewProductForm({
  categories,
  brands,
  onCreate,
}: {
  categories: Category[];
  brands: Brand[];
  onCreate: (
    p: {
      title: string;
      categoryId: string;
      brandId: string;
      description: string;
      condition: Condition;
      warrantyMonths: number;
      isActive: boolean;
    },
    variant: { sku: string; priceCedis: number; stock: number } | null,
  ) => void;
}) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<Condition>('new');
  const [warranty, setWarranty] = useState(12);
  const [isActive, setIsActive] = useState(false);
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');

  const ready = title.trim() && categoryId && brandId;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    const priceNum = Number(price);
    const variant =
      sku.trim() && priceNum > 0
        ? {
            sku: sku.trim(),
            priceCedis: priceNum,
            stock: Number(stock) || 0,
          }
        : null;
    onCreate(
      {
        title: title.trim(),
        categoryId,
        brandId,
        description: description.trim(),
        condition,
        warrantyMonths: warranty,
        isActive,
      },
      variant,
    );
    setTitle('');
    setDescription('');
    setSku('');
    setPrice('');
    setStock('0');
    setIsActive(false);
  }

  return (
    <form className="card" style={{ maxWidth: 'none' }} onSubmit={submit}>
      <h2 style={{ margin: 0, fontSize: '1.05rem' }}>New product</h2>
      <input
        className="input"
        placeholder="Title (e.g. iPhone 15 Pro)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
        <select
          className="input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
          <option value="">Brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="input"
        placeholder="Description (optional)"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
        <select
          className="input"
          value={condition}
          onChange={(e) => setCondition(e.target.value as Condition)}
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c.replace('_', ' ')}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Warranty (months)"
          value={warranty}
          onChange={(e) => setWarranty(Number(e.target.value) || 0)}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem' }}>
        <input
          className="input"
          placeholder="First SKU (optional)"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min={0}
          step="0.01"
          placeholder="Price GH₵"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </div>
      <label style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }} className="muted">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Publish immediately (visible on storefront)
      </label>
      <button className="btn" disabled={!ready}>
        Create product
      </button>
    </form>
  );
}

function ProductCard({
  product,
  onToggleActive,
  onAddVariant,
  onSaveVariant,
  onToggleVariant,
  onUploadImage,
  onDeleteImage,
}: {
  product: ProductRow;
  onToggleActive: () => void;
  onAddVariant: (sku: string, priceCedis: number, stock: number) => void;
  onSaveVariant: (id: string, priceCedis: number, stock: number) => void;
  onToggleVariant: (id: string, active: boolean) => void;
  onUploadImage: (file: File) => void;
  onDeleteImage: (id: string, storagePath: string) => void;
}) {
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');

  return (
    <div
      style={{ border: '1px solid hsl(var(--border))', borderRadius: '.5rem', padding: '.75rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{product.title}</strong>{' '}
          <span className="muted">
            · {product.category ?? 'no category'} · {product.brand ?? 'no brand'}
          </span>
        </div>
        <button className="btn secondary" onClick={onToggleActive}>
          {product.is_active ? 'Published' : 'Draft'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
        {product.images.map((img) => (
          <div key={img.id} style={{ position: 'relative' }}>
            <img
              src={imageUrl(img.storage_path)}
              alt=""
              style={{
                width: '3.5rem',
                height: '3.5rem',
                objectFit: 'cover',
                borderRadius: '.35rem',
                border: '1px solid hsl(var(--border))',
              }}
            />
            <button
              className="btn secondary"
              title="Remove image"
              onClick={() => onDeleteImage(img.id, img.storage_path)}
              style={{
                position: 'absolute',
                top: '-.4rem',
                right: '-.4rem',
                padding: '0 .35rem',
                lineHeight: 1.4,
                borderRadius: '999px',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <label
          className="btn secondary"
          style={{ display: 'grid', placeItems: 'center', width: '3.5rem', height: '3.5rem' }}
          title="Add image (max 2 MB)"
        >
          +
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadImage(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '.5rem 0 0' }}>
        {product.variants.map((v) => (
          <VariantEditor
            key={v.id}
            sku={v.sku}
            price={v.price}
            stock={v.stock}
            active={v.is_active}
            onSave={(p, s) => onSaveVariant(v.id, p, s)}
            onToggle={() => onToggleVariant(v.id, !v.is_active)}
          />
        ))}
      </ul>

      <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem' }}>
        <input
          className="input"
          placeholder="Add SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          style={{ flex: 2 }}
        />
        <input
          className="input"
          type="number"
          min={0}
          step="0.01"
          placeholder="GH₵"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ flex: 1 }}
        />
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          className="btn secondary"
          disabled={!sku.trim() || !(Number(price) > 0)}
          onClick={() => {
            onAddVariant(sku.trim(), Number(price), Number(stock) || 0);
            setSku('');
            setPrice('');
            setStock('0');
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function VariantEditor({
  sku,
  price,
  stock,
  active,
  onSave,
  onToggle,
}: {
  sku: string;
  price: number;
  stock: number;
  active: boolean;
  onSave: (priceCedis: number, stock: number) => void;
  onToggle: () => void;
}) {
  const [p, setP] = useState((price / 100).toFixed(2));
  const [s, setS] = useState(String(stock));

  return (
    <li
      style={{
        display: 'flex',
        gap: '.4rem',
        alignItems: 'center',
        padding: '.35rem 0',
        borderBottom: '1px solid hsl(var(--border))',
      }}
    >
      <code style={{ flex: 2 }}>{sku}</code>
      <span className="muted" style={{ width: '5rem' }}>
        {formatGHS(price)}
      </span>
      <input
        className="input"
        type="number"
        min={0}
        step="0.01"
        value={p}
        onChange={(e) => setP(e.target.value)}
        style={{ width: '6rem' }}
      />
      <input
        className="input"
        type="number"
        min={0}
        value={s}
        onChange={(e) => setS(e.target.value)}
        style={{ width: '5rem' }}
      />
      <button
        className="btn secondary"
        onClick={() => onSave(Number(p), Number(s) || 0)}
        disabled={!(Number(p) > 0)}
      >
        Save
      </button>
      <button className="btn secondary" onClick={onToggle}>
        {active ? 'On' : 'Off'}
      </button>
    </li>
  );
}
