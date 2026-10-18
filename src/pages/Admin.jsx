import { ClipboardList, ImagePlus, LayoutDashboard, Package, Save, Shirt, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { categories, formatCurrency, makeId, orderStatuses, prettyStatus } from '../lib/catalog.js';
import { MAX_PRODUCT_IMAGES, MAX_PRODUCT_IMAGE_SIZE, PRODUCT_IMAGE_MIME_TYPES } from '../lib/productImages.js';

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
  description: '',
};

export default function Admin() {
  const { users } = useAuth();
  const { products, orders, saveProduct, deleteProduct, updateOrder, deleteOrder } = useStore();
  const [view, setView] = useState('catalog');
  const [form, setForm] = useState(emptyProduct);
  const [imageItems, setImageItems] = useState([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [message, setMessage] = useState('');
  const previewUrls = useRef(new Set());

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  const metrics = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const stock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    return { revenue, stock };
  }, [orders, products]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function clearImageItems() {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
    setImageItems([]);
  }

  function resetForm() {
    setForm(emptyProduct);
    clearImageItems();
  }

  function handleImageSelection(event) {
    const selectedFiles = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!selectedFiles.length) return;

    const unsupported = selectedFiles.filter((file) => !PRODUCT_IMAGE_MIME_TYPES[file.type]);
    const tooLarge = selectedFiles.filter((file) => file.size > MAX_PRODUCT_IMAGE_SIZE);
    const validFiles = selectedFiles.filter(
      (file) => PRODUCT_IMAGE_MIME_TYPES[file.type] && file.size <= MAX_PRODUCT_IMAGE_SIZE,
    );
    const availableSlots = Math.max(0, MAX_PRODUCT_IMAGES - imageItems.length);
    const acceptedFiles = validFiles.slice(0, availableSlots);
    const newItems = acceptedFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { id: makeId('image'), file, previewUrl };
    });

    if (newItems.length) setImageItems((current) => [...current, ...newItems]);

    const notes = [];
    if (unsupported.length) notes.push('Use JPG, PNG, WEBP, or AVIF images.');
    if (tooLarge.length) notes.push('Each image must be 5 MB or smaller.');
    if (validFiles.length > acceptedFiles.length) notes.push(`You can add up to ${MAX_PRODUCT_IMAGES} images.`);
    setMessage(notes.join(' ') || `${newItems.length} image${newItems.length === 1 ? '' : 's'} ready to upload.`);
  }

  function removeImage(imageId) {
    const image = imageItems.find((item) => item.id === imageId);
    if (image?.file) {
      URL.revokeObjectURL(image.previewUrl);
      previewUrls.current.delete(image.previewUrl);
    }
    setImageItems((current) => current.filter((item) => item.id !== imageId));
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    if (!imageItems.length) {
      setMessage('Add at least one product image.');
      return;
    }

    setSavingProduct(true);
    setMessage('Saving product and uploading images...');
    try {
      const saved = await saveProduct({
        ...form,
        imageItems,
        price: Number(form.price),
        originalPrice: Number(form.originalPrice || form.price),
        stock: Number(form.stock),
        rating: Number(form.rating || 4.5),
      });
      setMessage(`${saved.name} saved.`);
      resetForm();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSavingProduct(false);
    }
  }

  function editProduct(product) {
    setView('catalog');
    clearImageItems();
    setImageItems(
      (product.imageUrls || []).map((url) => ({
        id: makeId('image'),
        url,
        previewUrl: url,
      })),
    );
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
                <div className="admin-image-manager">
                  <div className="admin-image-manager-heading">
                    <span>Product images</span>
                    <span>{imageItems.length} / {MAX_PRODUCT_IMAGES}</span>
                  </div>
                  <label className="upload-box image-upload-control">
                    <ImagePlus size={20} />
                    <span>Add images</span>
                    <small>JPG, PNG, WEBP, or AVIF · Up to 5 MB each</small>
                    <input
                      type="file"
                      accept={Object.keys(PRODUCT_IMAGE_MIME_TYPES).join(',')}
                      multiple
                      disabled={savingProduct || imageItems.length >= MAX_PRODUCT_IMAGES}
                      onChange={handleImageSelection}
                    />
                  </label>
                  {imageItems.length > 0 && (
                    <div className="admin-image-grid">
                      {imageItems.map((image, index) => (
                        <figure className="admin-image-preview" key={image.id}>
                          <img src={image.previewUrl || image.url} alt={`Product image ${index + 1}`} />
                          {index === 0 && <span className="admin-image-cover">Cover</span>}
                          <button
                            type="button"
                            className="admin-image-remove"
                            onClick={() => removeImage(image.id)}
                            disabled={savingProduct}
                            aria-label={`Remove product image ${index + 1}`}
                          >
                            <X size={16} />
                          </button>
                        </figure>
                      ))}
                    </div>
                  )}
                  <p className="admin-image-hint">First image appears on the shop cards. Add more for the product gallery.</p>
                </div>
                <div className="button-row">
                  <button className="button primary" type="submit" disabled={savingProduct}>
                    <Save size={18} /> {savingProduct ? 'Saving...' : 'Save product'}
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
                        {new Date(order.createdAt).toLocaleString()} / {order.items?.length || 0} items
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
                    <div className="admin-order-items">
                      <h4>Items in this order</h4>
                      {order.items?.length ? (
                        order.items.map((item) => {
                          const quantity = Number(item.quantity || 0);
                          return (
                            <div className="admin-order-item" key={item.cartKey || item.id || `${item.name}-${item.size}-${item.color}`}>
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt="" />
                              ) : (
                                <span className="admin-order-item-placeholder" aria-hidden="true" />
                              )}
                              <div className="admin-order-item-details">
                                <strong>{item.name}</strong>
                                <span>
                                  {[item.category, `Colour: ${item.color || 'N/A'}`, `Size: ${item.size || 'N/A'}`, `Qty: ${quantity}`]
                                    .filter(Boolean)
                                    .join(' / ')}
                                </span>
                              </div>
                              <div className="admin-order-item-price">
                                <span>{formatCurrency(item.price)} × {quantity}</span>
                                <strong>{formatCurrency(Number(item.price || 0) * quantity)}</strong>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p>Item details are not available for this order.</p>
                      )}
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
