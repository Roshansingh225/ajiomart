import { ClipboardList, ImagePlus, LayoutDashboard, Package, Save, Shirt, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { categories, formatCurrency, orderStatuses, prettyStatus } from '../lib/catalog.js';

const emptyProduct = {
  id: '',
  slug: '',
  name: '',
  category: 'Dresses',
  price: '',
  originalPrice: '',
  stock: 1,
  rating: 4.5,
  badge: '',
  colors: 'Black, Ivory',
  sizes: 'S, M, L',
  imageUrls: '',
  description: '',
};

export default function Admin() {
  const { users } = useAuth();
  const { products, orders, saveProduct, deleteProduct, updateOrder, deleteOrder } = useStore();
  const [view, setView] = useState('catalog');
  const [form, setForm] = useState(emptyProduct);
  const [message, setMessage] = useState('');

  const metrics = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const stock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    return { revenue, stock };
  }, [orders, products]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyProduct);
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    try {
      const saved = await saveProduct({
        ...form,
        price: Number(form.price),
        originalPrice: Number(form.originalPrice || form.price),
        stock: Number(form.stock),
        rating: Number(form.rating || 4.5),
      });
      setMessage(`${saved.name} saved.`);
      resetForm();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function editProduct(product) {
    setView('catalog');
    setForm({
      id: product.id,
      slug: product.slug || '',
      name: product.name,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      rating: product.rating,
      badge: product.badge || '',
      colors: product.colors?.join(', ') || '',
      sizes: product.sizes?.join(', ') || '',
      imageUrls: product.imageUrls?.join('\n') || '',
      description: product.description || '',
    });
    setMessage(`Editing ${product.name}.`);
  }

  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(`Delete ${product.name}?`);
    if (!confirmed) return;
    try {
      await deleteProduct(product.id);
      setMessage(`${product.name} deleted.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateOrderField(order, field, value) {
    try {
      await updateOrder(order.id, { [field]: value });
      setMessage(`Order ${order.id.slice(0, 10)} updated.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleDeleteOrder(order) {
    const confirmed = window.confirm(`Delete order ${order.id.slice(0, 10)}?`);
    if (!confirmed) return;
    try {
      await deleteOrder(order.id);
      setMessage('Order deleted.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="page admin-layout">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-top">
            <p className="eyebrow">Admin</p>
            <h1>Ajiomart Dashboard</h1>
            <p>Manage fashion inventory, cosmetics stock, customer orders, and delivery tracking.</p>
          </div>

          <nav className="admin-nav">
            <button className={view === 'catalog' ? 'active' : ''} onClick={() => setView('catalog')}>
              <Shirt size={18} /> Catalog
            </button>
            <button className={view === 'orders' ? 'active' : ''} onClick={() => setView('orders')}>
              <ClipboardList size={18} /> Orders
            </button>
            <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>
              <LayoutDashboard size={18} /> Overview
            </button>
          </nav>

          <div className="admin-sidebar-summary">
            <article className="admin-sidebar-card">
              <p className="eyebrow">Products</p>
              <strong>{products.length}</strong>
              <span>Fashion and beauty items</span>
            </article>
            <article className="admin-sidebar-card">
              <p className="eyebrow">Orders</p>
              <strong>{orders.length}</strong>
              <span>Customer checkouts</span>
            </article>
            <article className="admin-sidebar-card">
              <p className="eyebrow">Revenue</p>
              <strong>{formatCurrency(metrics.revenue)}</strong>
              <span>Total order value</span>
            </article>
          </div>
        </aside>

        <div className="admin-content">
          <div className="admin-stage">
            <div>
              <p className="eyebrow">Control room</p>
              <h2>
                {view === 'catalog'
                  ? 'Shape the Ajiomart shelf.'
                  : view === 'orders'
                    ? 'Track every delivery.'
                    : 'Read the business at a glance.'}
              </h2>
              <p>
                {view === 'catalog'
                  ? 'Add dresses, cosmetics, skincare, bags, shoes, and accessory drops.'
                  : view === 'orders'
                    ? 'Update order status, courier partner, tracking numbers, and customer notes.'
                    : 'Monitor products, stock, customers, and order value.'}
              </p>
            </div>
            <div className="admin-hero-badge">
              <Package size={18} />
              <span>{metrics.stock} stock units</span>
            </div>
          </div>

          {message && <p className="status-note">{message}</p>}

          {view === 'catalog' && (
            <div className="admin-section-grid">
              <form className="admin-card form-grid" onSubmit={handleSaveProduct}>
                <h2>{form.id ? 'Edit product' : 'Add product'}</h2>
                <label>
                  Name
                  <input value={form.name} onChange={(event) => update('name', event.target.value)} required />
                </label>
                <div className="checkout-grid">
                  <label>
                    Price
                    <input type="number" value={form.price} onChange={(event) => update('price', event.target.value)} required />
                  </label>
                  <label>
                    Original price
                    <input type="number" value={form.originalPrice} onChange={(event) => update('originalPrice', event.target.value)} />
                  </label>
                </div>
                <div className="checkout-grid">
                  <label>
                    Category
                    <select value={form.category} onChange={(event) => update('category', event.target.value)}>
                      {categories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Stock
                    <input type="number" value={form.stock} onChange={(event) => update('stock', event.target.value)} required />
                  </label>
                </div>
                <div className="checkout-grid">
                  <label>
                    Badge
                    <input value={form.badge} onChange={(event) => update('badge', event.target.value)} placeholder="New, Bestseller, Glow Pick" />
                  </label>
                  <label>
                    Rating
                    <input type="number" min="1" max="5" step="0.1" value={form.rating} onChange={(event) => update('rating', event.target.value)} />
                  </label>
                </div>
                <label>
                  Colors or shades
                  <input value={form.colors} onChange={(event) => update('colors', event.target.value)} />
                </label>
                <label>
                  Sizes or pack size
                  <input value={form.sizes} onChange={(event) => update('sizes', event.target.value)} />
                </label>
                <label>
                  Description
                  <textarea value={form.description} onChange={(event) => update('description', event.target.value)} required />
                </label>
                <label className="upload-box">
                  <ImagePlus /> Image URLs
                  <textarea
                    value={form.imageUrls}
                    onChange={(event) => update('imageUrls', event.target.value)}
                    placeholder="Paste one product image URL per line"
                    required
                  />
                </label>
                <div className="button-row">
                  <button className="button primary" type="submit">
                    <Save size={18} /> Save product
                  </button>
                  {form.id && (
                    <button className="button secondary" type="button" onClick={resetForm}>
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>

              <div className="admin-card">
                <h2>Products</h2>
                <div className="admin-list">
                  {products.map((product) => (
                    <article key={product.id} className="admin-row">
                      <img src={product.imageUrl} alt={product.name} />
                      <div>
                        <h3>{product.name}</h3>
                        <p>
                          {product.category} / {formatCurrency(product.price)} / Stock {product.stock}
                        </p>
                        <p>{product.colors?.join(', ')}</p>
                      </div>
                      <button onClick={() => editProduct(product)}>Edit</button>
                      <button className="icon-button danger" onClick={() => handleDeleteProduct(product)} aria-label={`Delete ${product.name}`}>
                        <Trash2 />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'orders' && (
            <div className="admin-card">
              <h2>Orders</h2>
              <div className="admin-list">
                {orders.map((order) => (
                  <article className="order-row expanded" key={order.id}>
                    <div>
                      <h3>
                        {formatCurrency(order.total)} / {order.paymentMethod}
                      </h3>
                      <p>
                        {new Date(order.createdAt).toLocaleString()} / {order.items.length} items
                      </p>
                      <p>
                        {order.customerName} / {order.customerPhone}
                      </p>
                      <p>
                        {[
                          order.address?.addressLine1,
                          order.address?.addressLine2,
                          order.address?.landmark,
                          order.address?.city,
                          order.address?.state,
                          order.address?.postalCode,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                    <div className="order-actions">
                      <select value={order.status} onChange={(event) => updateOrderField(order, 'status', event.target.value)}>
                        {orderStatuses.map((status) => (
                          <option value={status} key={status}>
                            {prettyStatus(status)}
                          </option>
                        ))}
                      </select>
                      <button className="icon-button danger" onClick={() => handleDeleteOrder(order)} aria-label={`Delete order ${order.id}`}>
                        <Trash2 />
                      </button>
                    </div>
                    <div className="tracking-form-grid">
                      <label>
                        Courier partner
                        <input value={order.courierPartner || ''} onChange={(event) => updateOrderField(order, 'courierPartner', event.target.value)} />
                      </label>
                      <label>
                        Tracking number
                        <input value={order.trackingNumber || ''} onChange={(event) => updateOrderField(order, 'trackingNumber', event.target.value)} />
                      </label>
                      <label>
                        Tracking URL
                        <input value={order.trackingUrl || ''} onChange={(event) => updateOrderField(order, 'trackingUrl', event.target.value)} />
                      </label>
                      <label>
                        Tracking note
                        <input value={order.trackingNote || ''} onChange={(event) => updateOrderField(order, 'trackingNote', event.target.value)} />
                      </label>
                    </div>
                  </article>
                ))}
                {!orders.length && <p>No orders yet.</p>}
              </div>
            </div>
          )}

          {view === 'overview' && (
            <div className="overview-grid">
              <article className="admin-card stat-card">
                <p className="eyebrow">Customers</p>
                <h2>{users.length}</h2>
                <p>Customer accounts and signups available to the current admin session.</p>
              </article>
              <article className="admin-card stat-card">
                <p className="eyebrow">Inventory</p>
                <h2>{metrics.stock}</h2>
                <p>Units available across fashion and cosmetics categories.</p>
              </article>
              <article className="admin-card stat-card">
                <p className="eyebrow">Average order</p>
                <h2>{formatCurrency(orders.length ? metrics.revenue / orders.length : 0)}</h2>
                <p>Based on the current order list.</p>
              </article>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
