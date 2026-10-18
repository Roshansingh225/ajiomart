import { AlertTriangle, CheckCircle2, PackageCheck, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { formatCurrency, orderStatuses, prettyStatus } from '../lib/catalog.js';

export default function Orders() {
  const navigate = useNavigate();
  const { user, deleteAccount } = useAuth();
  const { orders } = useStore();
  const [accountStatus, setAccountStatus] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const userOrders = useMemo(
    () => orders.filter((order) => order.userId === user?.id),
    [orders, user],
  );

  function getTimeline(order) {
    const currentIndex = orderStatuses.indexOf(order.status);
    return orderStatuses
      .filter((status) => status !== 'cancelled' || order.status === 'cancelled')
      .map((status, index) => ({
        label: prettyStatus(status),
        active: order.status === 'cancelled' ? status === 'cancelled' : index <= currentIndex,
      }));
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm('Delete your Ajiomart account from this device? This cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingAccount(true);
      setAccountStatus('Deleting your account...');
      const payload = await deleteAccount();
      setAccountStatus(payload.message);
      window.setTimeout(() => navigate('/', { replace: true }), 900);
    } catch (error) {
      setAccountStatus(error.message);
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">My Orders</p>
        <h1>Your fashion and beauty orders.</h1>
      </div>

      <div className="order-history-list">
        {userOrders.map((order) => {
          const timeline = getTimeline(order);

          return (
            <article className="order-history-card" key={order.id}>
              <div className="order-history-top">
                <div>
                  <p className="eyebrow">{order.paymentMethod}</p>
                  <h2>{formatCurrency(order.total)}</h2>
                  <p>{new Date(order.createdAt).toLocaleString()}</p>
                  {order.paymentMethod === 'Online Payment' && order.paymentStatus === 'paid' && (
                    <span className="payment-confirmation"><CheckCircle2 size={15} /> Payment confirmed</span>
                  )}
                </div>
                <div className="order-pill">{prettyStatus(order.status)}</div>
              </div>

              <div className="order-item-mini-list">
                {order.items.map((item) => (
                  <div key={item.cartKey} className="order-item-mini">
                    <img src={item.imageUrl} alt={item.name} />
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.quantity} x {formatCurrency(item.price)} / {item.color} / {item.size}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="tracking-card">
                <div className="tracking-header">
                  <div>
                    <p className="eyebrow">Delivery</p>
                    <strong>{order.courierPartner || 'Ajiomart Express'}</strong>
                  </div>
                  <Truck size={18} />
                </div>

                <p>{order.trackingNote || 'Tracking details will appear once the order is packed.'}</p>
                {order.trackingNumber && <p>Tracking No: {order.trackingNumber}</p>}

                <div className="button-row">
                  <button className="button secondary">
                    <PackageCheck size={18} /> {prettyStatus(order.status)}
                  </button>
                  {order.trackingUrl && (
                    <a className="button primary" href={order.trackingUrl} target="_blank" rel="noreferrer">
                      Open tracking page
                    </a>
                  )}
                </div>

                <div className="tracking-timeline">
                  {timeline.map((step) => (
                    <div key={step.label} className={step.active ? 'timeline-step active' : 'timeline-step'}>
                      <span className="timeline-dot" />
                      <strong>{step.label}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!userOrders.length && (
        <div className="empty-state">
          <p>No orders yet. Once you checkout, your dresses, cosmetics, and accessories will show here.</p>
        </div>
      )}

      <div className="account-panel">
        <div className="account-panel-copy">
          <p className="eyebrow">Account</p>
          <h2>Delete your account</h2>
          <p>This removes your Ajiomart login. Order records may remain available for fulfilment and support.</p>
        </div>
        <div className="account-panel-actions">
          <button className="button secondary danger-button" onClick={handleDeleteAccount} disabled={deletingAccount}>
            <AlertTriangle size={18} /> {deletingAccount ? 'Deleting...' : 'Delete account'}
          </button>
          {accountStatus && <p className="status-note">{accountStatus}</p>}
        </div>
      </div>
    </section>
  );
}
