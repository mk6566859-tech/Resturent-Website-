import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Code2, Globe2,
  MapPin, Menu as MenuIcon, MessageCircle, Minus, Monitor, Phone, Plus,
  Search, ShoppingBag, Smartphone, X,
} from 'lucide-react'
import { restaurant } from './config/restaurant'
import { categories as initialCategories, dishes as initialDishes } from './data/menu'
import { apiConfigured, request } from './lib/api'
import { createWhatsAppUrl, formatPrice } from './lib/format'
import './App.css'

const currentYear = new Date().getFullYear()
const minimumReservationDate = new Date().toISOString().slice(0, 10)
const currentTime = new Date().toTimeString().slice(0, 5)

function Header({ cartCount, onCart, restaurantConfig }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const closeMenu = () => setOpen(false)
  const navigateToSection = (event, href) => {
    event.preventDefault()
    closeMenu()
    navigate(`/${href}`)
    const targetId = href.slice(1)
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }
  return (
    <header className="site-header">
      <Link className="wordmark" to="/" onClick={closeMenu} aria-label={`${restaurantConfig.name} home`}>
        {restaurantConfig.logo ? <img className="brand-logo" src={restaurantConfig.logo} alt="" /> : <span className="wordmark-mark">S</span>}
        <span>{restaurantConfig.name}<small>{restaurantConfig.locationLabel}</small></span>
      </Link>
      <button className="icon-button mobile-menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X /> : <MenuIcon />}
      </button>
      <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
        {[
          ['Menu', '#menu', restaurantConfig.sections?.menu !== false],
          ['Our story', '#story', restaurantConfig.sections?.story !== false],
          ['Gallery', '#gallery', restaurantConfig.sections?.gallery !== false],
          ['Visit us', '#visit', restaurantConfig.sections?.visit !== false],
        ].filter(([, , visible]) => visible).map(([label, href]) => (
          <a href={`/${href}`} key={label} onClick={(event) => navigateToSection(event, href)}>{label}</a>
        ))}
        <Link to="/developers" onClick={closeMenu}>Developers</Link>
        {restaurantConfig.sections?.reservations !== false && <a className="nav-reserve" href="/#reserve" onClick={(event) => navigateToSection(event, '#reserve')}>Reserve a table <ArrowUpRight size={14} /></a>}
        <Link className="nav-admin" to="/admin" onClick={closeMenu}>Admin <ArrowUpRight size={14} /></Link>
      </nav>
      <button className="bag-button" onClick={onCart} aria-label={`Open bag, ${cartCount} items`}>
        <ShoppingBag size={17} /><span>Bag</span><b>{cartCount}</b>
      </button>
    </header>
  )
}

function SectionHeading({ eyebrow, title, text, light = false }) {
  return <div className={`section-heading${light ? ' light' : ''}`}>
    <p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{text && <p className="section-intro">{text}</p>}
  </div>
}

function DishCard({ dish, onAdd }) {
  return <article className="dish-card">
    <div className="dish-image-wrap">
      <img src={dish.image} alt={dish.name} loading="lazy" />
      {dish.featured && <span className="image-tag">HOUSE FAVOURITE</span>}
      {!dish.available && <span className="unavailable-tag">Currently unavailable</span>}
      <button className="add-dish" onClick={() => onAdd(dish)} disabled={!dish.available} aria-label={`Add ${dish.name} to bag`}><Plus size={18} /></button>
    </div>
    <div className="dish-copy"><div><h3>{dish.name}</h3><p>{dish.description}</p></div><strong>{formatPrice(dish.price)}</strong></div>
  </article>
}

function HomePage({ dishes, categories, onAdd, onReserve, restaurantConfig }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const visibleDishes = useMemo(() => dishes.filter((dish) =>
    (activeCategory === 'All' || dish.category === activeCategory) &&
    `${dish.name} ${dish.description} ${dish.category}`.toLowerCase().includes(search.toLowerCase()),
  ), [dishes, activeCategory, search])
  const featured = dishes.filter((dish) => dish.featured && dish.available).slice(0, 3)

  return <main>
    <section className="hero" id="home">
      <div className="hero-image" style={{ backgroundImage: `url("${restaurantConfig.hero.image}")` }} />
      <div className="hero-shade" />
      <div className="hero-content">
        <p className="eyebrow">{restaurantConfig.hero.eyebrow}</p>
        <h1>{restaurantConfig.hero.title}</h1>
        <p className="hero-description">{restaurantConfig.hero.description}</p>
        <div className="hero-actions"><a className="button button-copper" href="#menu">Explore the menu <ArrowRight size={16} /></a><a className="button button-outline" href="#reserve">Book a table</a></div>
      </div>
      <div className="hero-foot"><span>GULBERG III, LAHORE</span><a href="#story">SCROLL TO DISCOVER <ArrowDown size={13} /></a><span>OPEN DAILY · 12 PM TILL LATE</span></div>
    </section>

    <section className="intro-band">
      <p>ROOTED IN THE LAND.<br />MADE FOR THE MOMENT.</p>
      <div><span className="intro-rule" /><p>We bring the warmth of Pakistani hospitality to a table shaped by fire, season and a little curiosity.</p></div>
    </section>

    {restaurantConfig.sections?.signature !== false && <section className="section featured-section" id="signature">
      <SectionHeading eyebrow="A FEW HOUSE FAVOURITES" title={<>Good things<br className="mobile-break" /> take their time.</>} text="The dishes our regulars return to, and first-time guests remember." />
      <div className="dish-grid featured-grid">{featured.map((dish) => <DishCard key={dish.id} dish={dish} onAdd={onAdd} />)}</div>
      <a className="text-link" href="#menu">VIEW THE FULL MENU <ArrowRight size={15} /></a>
    </section>}

    {restaurantConfig.sections?.menu !== false && <section className="menu-section section" id="menu">
      <div className="menu-top">
        <SectionHeading eyebrow="FROM OUR KITCHEN" title="The menu" text="A little smoke, a lot of soul. Prepared fresh, served with generosity." />
        <label className="menu-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a dish" aria-label="Search menu" />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}</label>
      </div>
      <div className="category-tabs" role="tablist" aria-label="Menu categories">
        {categories.map((category) => <button key={category} role="tab" aria-selected={activeCategory === category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}
      </div>
      {visibleDishes.length ? <div className="dish-grid">{visibleDishes.map((dish) => <DishCard key={dish.id} dish={dish} onAdd={onAdd} />)}</div> : <div className="empty-state">No dishes match that search. Try another name or category.</div>}
      <p className="menu-note">All prices are in PKR. Please let our team know about any allergies.</p>
    </section>}

    {restaurantConfig.sections?.story !== false && <section className="story-section" id="story">
      <div className="story-photo"><img src={restaurantConfig.images?.story || restaurant.images.story} alt="Warmly lit restaurant dining room prepared for service" loading="lazy" /><span>AT THE HEART OF GULBERG</span></div>
      <div className="story-copy"><p className="eyebrow">OUR TABLE, YOURS TOO</p><h2>Old recipes.<br /><em>New memories.</em></h2><p>Our story starts with a belief: the best meals are never only about the food. They are about the hands that make it, the people around the table, and the stories that stay long after.</p><p>At Saffron & Smoke, Pakistan’s regional flavours meet a thoughtful, modern kitchen—always generous, always made with care.</p><a className="text-link" href="#visit">COME AS YOU ARE <ArrowRight size={15} /></a></div>
    </section>}

    {restaurantConfig.sections?.offer !== false && <section className="offer-band"><div><p className="eyebrow">{restaurantConfig.offer.eyebrow}</p><h2>{restaurantConfig.offer.title}</h2><p>{restaurantConfig.offer.description}</p></div><a href="#reserve" className="button button-outline">Ask us about it <ArrowRight size={16} /></a></section>}

    {restaurantConfig.sections?.gallery !== false && <section className="gallery-section section" id="gallery">
      <SectionHeading eyebrow="A SENSE OF PLACE" title="Come in. Stay a while." text="A glimpse of the warmth waiting around our table." />
      <div className="gallery-grid">
        {(restaurantConfig.images?.gallery || restaurant.images.gallery).map((image, index) => <img key={image} src={image} alt={['A candlelit restaurant table set for dinner', 'Freshly prepared seasonal ingredients', 'Intimate dining room with warm lighting'][index] || 'Restaurant gallery'} loading="lazy" />)}
      </div>
      <a className="text-link" href={restaurantConfig.instagram} target="_blank" rel="noreferrer">FOLLOW OUR TABLE <ArrowUpRight size={14} /></a>
    </section>}

    {restaurantConfig.sections?.reservations !== false && <section className="reserve-section" id="reserve">
      <div className="reserve-intro"><p className="eyebrow">YOUR PLACE IS WAITING</p><h2>Make an evening<br /><em>of it.</em></h2><p>Tell us a little about your plans. We’ll be in touch to confirm your table.</p><div className="reserve-meta"><span><Clock3 size={16} /> DAILY FROM NOON</span><span><MapPin size={16} /> GULBERG III, LAHORE</span></div></div>
      <ReservationForm onReserve={onReserve} />
    </section>}

    {restaurantConfig.sections?.visit !== false && <section className="visit-section section" id="visit">
      <div className="visit-main"><p className="eyebrow">FIND YOUR WAY HERE</p><h2>There’s a seat<br />with your name on it.</h2><a className="text-link" href={`https://maps.google.com/?q=${encodeURIComponent(restaurantConfig.address)}`} target="_blank" rel="noreferrer"><MapPin size={15} /> GET DIRECTIONS <ArrowUpRight size={14} /></a></div>
      <div className="visit-detail"><h3>Come by</h3><p>{restaurantConfig.address}<br />{restaurantConfig.locationLabel}</p><h3>Opening hours</h3>{restaurantConfig.hours.map((entry) => <p className="hours-line" key={entry.days}><span>{entry.days}</span><span>{entry.hours}</span></p>)}</div>
      <div className="visit-detail"><h3>Say hello</h3><a href={`tel:${restaurantConfig.phone}`}>{restaurantConfig.phone}</a><a href={`mailto:${restaurantConfig.email}`}>{restaurantConfig.email}</a><h3>Follow along</h3><a href={restaurantConfig.instagram} target="_blank" rel="noreferrer">@saffronandsmoke</a></div>
    </section>}
  </main>
}

function ReservationForm({ onReserve }) {
  const [form, setForm] = useState({ name: '', phone: '', date: '', time: '', guests: '2', notes: '' })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [availability, setAvailability] = useState({ key: '', slots: [], tablesConfigured: false, error: '' })
  const [lookupForm, setLookupForm] = useState({ reference: '', phone: '' })
  const [booking, setBooking] = useState(null)
  const [bookingChange, setBookingChange] = useState({ date: '', time: '', guests: '2' })
  const [lookupError, setLookupError] = useState('')
  const update = (event) => setForm({
    ...form,
    [event.target.name]: event.target.value,
    ...(event.target.name === 'guests' ? { time: '' } : {}),
  })
  useEffect(() => {
    if (!apiConfigured || !form.date) return undefined
    let current = true
    const key = `${form.date}:${form.guests}`
    request(`/reservations/availability?date=${encodeURIComponent(form.date)}&guests=${encodeURIComponent(form.guests)}`)
      .then((result) => {
        if (current) setAvailability({ ...result, key, error: '' })
      })
      .catch((error) => {
        if (current) setAvailability({ key, slots: [], tablesConfigured: false, error: error.message })
      })
    return () => { current = false }
  }, [form.date, form.guests])
  async function submit(event) {
    event.preventDefault()
    setStatus({ type: 'loading', message: 'Sending your request…' })
    try {
      const result = await onReserve(form)
      setStatus({
        type: 'success',
        message: result?.bookingReference
          ? `Request received. Your booking reference is ${result.bookingReference}. Keep it with your phone number to look up or change your booking.`
          : 'Thank you. Your request is in — our team will contact you to confirm.',
      })
      setForm({ name: '', phone: '', date: '', time: '', guests: '2', notes: '' })
    } catch (error) { setStatus({ type: 'error', message: error.message }) }
  }
  async function findBooking(event) {
    event.preventDefault(); setLookupError(''); setBooking(null)
    try {
      const result = await request('/reservations/lookup', { method: 'POST', body: JSON.stringify(lookupForm) })
      setBooking(result)
      setBookingChange({
        date: new Date(result.date).toISOString().slice(0, 10),
        time: /^\d{2}:\d{2}$/.test(result.time) ? result.time : '',
        guests: String(result.guests),
      })
    } catch (error) { setLookupError(error.message) }
  }
  async function updateBooking(action) {
    setLookupError('')
    try {
      const result = await request(`/reservations/reference/${encodeURIComponent(lookupForm.reference)}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...bookingChange, phone: lookupForm.phone, action }),
      })
      setBooking(result)
      setLookupError(action === 'cancel' ? 'Booking cancelled.' : 'Booking rescheduled.')
    } catch (error) { setLookupError(error.message) }
  }
  const availabilityKey = `${form.date}:${form.guests}`
  const currentAvailability = availability.key === availabilityKey
    ? availability
    : { slots: [], tablesConfigured: false, error: '' }
  const availabilityLoading = Boolean(apiConfigured && form.date && availability.key !== availabilityKey)
  const serviceTimes = currentAvailability.tablesConfigured
    ? currentAvailability.slots.filter((slot) => slot.available).map((slot) => slot.time)
    : ['12:00 PM', '1:00 PM', '2:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM']
  return <div className="reservation-flow">
    <form className="reservation-form" onSubmit={submit}>
      <div className="form-row"><label>Your name<input name="name" value={form.name} onChange={update} required minLength="2" autoComplete="name" placeholder="Name" /></label><label>Phone number<input name="phone" value={form.phone} onChange={update} required pattern="[+0-9 ()-]{8,20}" autoComplete="tel" placeholder="+92" /></label></div>
      <div className="form-row"><label>Date<input name="date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value, time: '' })} required min={minimumReservationDate} /></label><label>Preferred time<select name="time" value={form.time} onChange={update} required disabled={availabilityLoading || (currentAvailability.tablesConfigured && !serviceTimes.length)}><option value="">{availabilityLoading ? 'Checking availability…' : 'Choose a time'}</option>{serviceTimes.map((time) => <option key={time}>{time}</option>)}</select></label></div>
      <div className="form-row"><label>Guests<select name="guests" value={form.guests} onChange={update}>{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? 'guest' : 'guests'}</option>)}</select></label><label>Anything we should know?<input name="notes" value={form.notes} onChange={update} maxLength="300" placeholder="Optional" /></label></div>
      <button type="submit" className="button button-copper" disabled={status.type === 'loading'}>{status.type === 'loading' ? 'Sending…' : 'Request a table'} <ArrowRight size={16} /></button>
      {status.message && <p className={`form-status ${status.type}`} role="status">{status.message}</p>}
      {currentAvailability.error && <p className="form-status error" role="alert">{currentAvailability.error}</p>}
      {form.date && currentAvailability.tablesConfigured && !availabilityLoading && !serviceTimes.length && <p className="form-hint">No tables are available for this date and party size. Please choose another date or contact the restaurant.</p>}
      {form.date && !currentAvailability.tablesConfigured && !availabilityLoading && <p className="form-hint">Online availability is not configured yet. Requests will be sent to the restaurant for confirmation.</p>}
      {!apiConfigured && <p className="form-hint">Reservation requests need the API connection. For now, please call us to confirm your table.</p>}
    </form>
    <div className="booking-lookup">
      <h3>Already have a booking?</h3>
      <form className="reservation-form" onSubmit={findBooking}>
        <label>Booking reference<input required minLength="20" maxLength="40" value={lookupForm.reference} onChange={(event) => setLookupForm({ ...lookupForm, reference: event.target.value.toUpperCase() })} /></label>
        <label>Phone used for the booking<input type="tel" required value={lookupForm.phone} onChange={(event) => setLookupForm({ ...lookupForm, phone: event.target.value })} /></label>
        <button className="button button-outline">Find booking</button>
      </form>
      {booking && <div className="booking-result"><p><strong>{booking.name}</strong> · {booking.guests} guests · {new Date(booking.date).toLocaleDateString()} · {booking.time}</p><p>Reference: {booking.bookingReference} · {booking.status.replace('_', ' ')}</p>
        {['requested', 'confirmed'].includes(booking.status) && <div className="booking-actions"><label>New date<input type="date" min={minimumReservationDate} value={bookingChange.date} onChange={(event) => setBookingChange({ ...bookingChange, date: event.target.value })} /></label><label>New time<input type="time" value={bookingChange.time} onChange={(event) => setBookingChange({ ...bookingChange, time: event.target.value })} /></label><label>Guests<input type="number" min="1" max="20" value={bookingChange.guests} onChange={(event) => setBookingChange({ ...bookingChange, guests: event.target.value })} /></label><button className="button button-copper" onClick={() => updateBooking('reschedule')}>Request change</button><button className="button button-outline" onClick={() => updateBooking('cancel')}>Cancel booking</button></div>}
      </div>}
      {lookupError && <p className={`form-status ${lookupError.includes('cancelled') || lookupError.includes('rescheduled') ? 'success' : 'error'}`} role="status">{lookupError}</p>}
    </div>
  </div>
}

function Footer({ restaurantConfig }) {
  return <footer className="site-footer"><Link className="wordmark footer-brand" to="/">{restaurantConfig.logo ? <img className="brand-logo" src={restaurantConfig.logo} alt="" /> : <span className="wordmark-mark">S</span>}<span>{restaurantConfig.name}<small>{restaurantConfig.locationLabel}</small></span></Link><p>Made with warmth in Lahore.</p><span>© {currentYear} {restaurantConfig.name}</span><Link className="developer-credit" to="/developers">Website by <img src="/haden-tech-mark.svg" alt="Haden Tech logo" /><strong>Haden Tech</strong></Link><Link className="admin-link" to="/admin">Admin</Link></footer>
}

function DevelopersPage() {
  const services = [
    { icon: <Monitor />, title: 'Web Development', text: 'Modern, responsive websites made for your business.' },
    { icon: <Globe2 />, title: 'Web Applications', text: 'Useful digital tools that help teams work smarter.' },
    { icon: <Smartphone />, title: 'Mobile Applications', text: 'Mobile experiences designed around your customers.' },
    { icon: <ShoppingBag />, title: 'E-commerce Solutions', text: 'Online stores that make it easy to browse and buy.' },
  ]
  const socialLinks = [
    { mark: 'in', label: 'LinkedIn', href: 'https://www.linkedin.com/in/malik-kashan-b7714439b?utm_source=share_via&utm_content=profile&utm_medium=member_android' },
    { mark: 'f', label: 'Facebook', href: 'https://www.facebook.com/share/1QyDqjDga3/' },
    { mark: 'ig', label: 'Instagram · @hadentech1', href: 'https://www.instagram.com/hadentech1/' },
  ]

  return <main className="developers-page">
    <section className="developers-hero">
      <div className="developers-hero-copy">
        <div className="developers-brand"><img src="/haden-tech-mark.svg" alt="Haden Tech logo" /><h1>Haden <span>Tech</span></h1></div>
        <p className="eyebrow">THE TECHNOLOGY EDGE</p>
        <p className="developers-tagline">Building modern digital solutions for today’s businesses.</p>
        <a className="button button-copper" href="#developer-contact">Let’s talk <ArrowUpRight size={16} /></a>
      </div>
      <div className="developers-code-card" aria-hidden="true">
        <span className="developers-code-mark">H<span>.</span></span>
        <Code2 size={30} />
        <p>Your idea.<br />Our code.<br /><strong>Real results.</strong></p>
        <div className="developers-code-line" />
      </div>
    </section>
    <section className="developers-services">
      <div className="developers-section-heading">
        <p className="eyebrow">WHAT WE DO</p>
        <h2>Digital solutions,<br />built around you.</h2>
      </div>
      <div className="developers-service-grid">
        {services.map(({ icon, title, text }) => <article className="developers-service" key={title}>
          <span className="developers-service-icon">{icon}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>)}
      </div>
    </section>
    <section className="developers-contact" id="developer-contact">
      <div>
        <p className="eyebrow">HAVE A PROJECT IN MIND?</p>
        <h2>Let’s build something great.</h2>
        <p>Get in touch with Haden Tech to talk about your next digital project.</p>
        <a className="developers-phone" href="tel:+923421039774"><Phone size={17} /> +92 342 103 9774</a>
        <a className="button button-copper developers-whatsapp" href="https://wa.me/923421039774" target="_blank" rel="noreferrer">
          <MessageCircle size={16} /> Chat on WhatsApp <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="developers-socials" aria-label="Haden Tech social media">
        {socialLinks.map(({ mark, label, href }) => <a href={href} key={label} target="_blank" rel="noreferrer">
          <span className="developer-social-mark" aria-hidden="true">{mark}</span><span>{label}</span><ArrowUpRight size={14} />
        </a>)}
      </div>
    </section>
  </main>
}

function DeveloperChatButton() {
  return <a className="developers-floating-contact" href="https://wa.me/923421039774" target="_blank" rel="noreferrer">
    <MessageCircle size={19} aria-hidden="true" />
    <span>Chat with developer</span>
  </a>
}

function CartToast({ toast }) {
  if (!toast) return null
  return <div className="cart-toast" role="status" aria-live="polite" key={toast.id}>
    <Check className="cart-toast-check" size={18} aria-hidden="true" />
    <span className="cart-toast-message">{toast.message}</span>
  </div>
}

function CartOrderButton({ cart, restaurantConfig }) {
  const items = Object.values(cart)
  if (!items.length) return null
  return <a className="cart-order-button" href={createWhatsAppUrl(restaurantConfig.whatsapp, items)} target="_blank" rel="noreferrer">
    <ShoppingBag size={18} aria-hidden="true" />
    <span>Order on WhatsApp</span>
    <b>{items.reduce((count, item) => count + item.quantity, 0)}</b>
  </a>
}

function CartDrawer({ cart, onClose, onQuantity, restaurantConfig }) {
  const items = Object.values(cart)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation">
    <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <div className="drawer-header"><div><p className="eyebrow">A GOOD CHOICE</p><h2 id="cart-title">Your bag <span>({items.reduce((sum, item) => sum + item.quantity, 0)})</span></h2></div><button className="icon-button" onClick={onClose} aria-label="Close bag"><X /></button></div>
      {!items.length ? <div className="cart-empty"><ShoppingBag size={30} /><p>Your bag is waiting for something delicious.</p><button className="text-link" onClick={onClose}>EXPLORE THE MENU <ArrowRight size={15} /></button></div> : <>
        <div className="cart-items">{items.map((item) => <div className="cart-row" key={item.id}><img src={item.image} alt="" /><div className="cart-item-copy"><h3>{item.name}</h3><p>{formatPrice(item.price)}</p><div className="quantity-control"><button onClick={() => onQuantity(item.id, -1)} aria-label={`Remove one ${item.name}`}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => onQuantity(item.id, 1)} aria-label={`Add one ${item.name}`}><Plus size={13} /></button></div></div><strong>{formatPrice(item.price * item.quantity)}</strong></div>)}</div>
        <div className="cart-total"><span>Subtotal</span><strong>{formatPrice(total)}</strong><p>Delivery and final confirmation arranged on WhatsApp.</p><a className="button button-copper" href={createWhatsAppUrl(restaurantConfig.whatsapp, items)} target="_blank" rel="noreferrer" onClick={onClose}>Continue on WhatsApp <ArrowUpRight size={16} /></a></div>
      </>}
    </aside>
  </div>
}

const workspaceItems = [
  ['overview', 'Overview'],
  ['reservations', 'Reservations'],
  ['floor', 'Floor Plan'],
  ['waitlist', 'Walk-ins & Waitlist'],
  ['customers', 'Customers'],
  ['staff', 'Staff Management', 'admin'],
  ['reports', 'Reports'],
  ['menu', 'Menu & Website', 'admin'],
  ['booking', 'Booking Settings', 'admin'],
  ['activity', 'Activity Log', 'admin'],
  ['general', 'General Settings', 'admin'],
]

function TableCard({ table, user, onSave }) {
  const [form, setForm] = useState({
    label: table.label,
    section: table.section,
    capacity: table.capacity,
    combinationGroup: table.combinationGroup || '',
    active: table.active,
  })
  return <article className="admin-panel table-card">
    {user.role === 'admin' ? <form className="admin-form" onSubmit={(event) => { event.preventDefault(); onSave(table, form) }}>
      <label>Table label<input required maxLength="30" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></label>
      <label>Section<input required maxLength="60" value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} /></label>
      <label>Seats<input type="number" min="1" max="30" required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></label>
      <label>Combination group<input maxLength="60" value={form.combinationGroup} onChange={(event) => setForm({ ...form, combinationGroup: event.target.value })} /></label>
      <span className={table.active ? 'table-active' : 'table-inactive'}>{table.active ? 'Active' : 'Inactive'}</span>
      <button className="button button-outline">Save table</button>
    </form> : <>
      <strong>{table.label}</strong><span>{table.section}</span><span>{table.capacity} seats{table.combinationGroup ? ` · ${table.combinationGroup}` : ''}</span>
      <span className={table.active ? 'table-active' : 'table-inactive'}>{table.active ? 'Active' : 'Inactive'}</span>
    </>}
    {user.role === 'admin' && table.active && <button className="button button-outline" onClick={() => onSave(table, { active: false })}>Deactivate</button>}
    {user.role === 'admin' && !table.active && <button className="button button-copper" onClick={() => onSave(table, { active: true })}>Reactivate table</button>}
  </article>
}

function AdminWorkspace({
  activeView, user, reservations, tables, waitlist, staff, activity, bookingSettings,
  setBookingSettings, closureForm, setClosureForm, tableForm, setTableForm, staffForm, setStaffForm,
  staffBookingForm, setStaffBookingForm, walkInForm,
  setWalkInForm, customerSearch, setCustomerSearch, reservationSearch, setReservationSearch,
  onStatusChange, onUpdateReservation, onAddStaffReservation, onAddTable, onUpdateTable, onAddStaff, onToggleStaff,
  editingStaffId, onEditStaff, onCancelStaffEdit,
  onSaveBookingSettings, onAddWalkIn, onUpdateWaitlist,
  onAddClosure, onRemoveClosure, busy,
}) {
  const today = minimumReservationDate
  const todayReservations = reservations.filter((item) => new Date(item.date).toISOString().slice(0, 10) === today && item.status !== 'cancelled')
  const filteredReservations = reservations.filter((item) =>
    `${item.name} ${item.phone} ${item.bookingReference || ''}`.toLowerCase().includes(reservationSearch.toLowerCase()),
  )
  if (activeView === 'overview') return <div className="workspace-grid">
    {[
      ['Today’s reservations', todayReservations.length],
      ['Expected covers', todayReservations.reduce((total, item) => total + item.guests, 0)],
      ['Awaiting confirmation', reservations.filter((item) => item.status === 'requested').length],
      ['Waiting parties', waitlist.length],
    ].map(([label, value]) => <article className="admin-panel summary-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}
    <section className="admin-panel workspace-wide"><h2>Today at a glance</h2>{todayReservations.length
      ? todayReservations.map((item) => <p className="workspace-row" key={item._id}><strong>{item.time} · {item.name}</strong><span>{item.guests} guests · {item.status.replace('_', ' ')}</span></p>)
      : <p>No reservations scheduled for today.</p>}
    </section>
  </div>
  if (activeView === 'reservations') return <section className="admin-panel">
    <h2>Reservations <span>{reservations.length}</span></h2>
    <details className="reservation-create"><summary>Create a reservation</summary><form className="admin-form" onSubmit={onAddStaffReservation}>
      <div className="form-row"><label>Guest name<input required minLength="2" value={staffBookingForm.name} onChange={(event) => setStaffBookingForm({ ...staffBookingForm, name: event.target.value })} /></label><label>Phone<input required value={staffBookingForm.phone} onChange={(event) => setStaffBookingForm({ ...staffBookingForm, phone: event.target.value })} /></label></div>
      <div className="form-row"><label>Date<input type="date" min={minimumReservationDate} required value={staffBookingForm.date} onChange={(event) => setStaffBookingForm({ ...staffBookingForm, date: event.target.value })} /></label><label>Time<input type="time" required value={staffBookingForm.time} onChange={(event) => setStaffBookingForm({ ...staffBookingForm, time: event.target.value })} /></label></div>
      <label>Guests<input type="number" min="1" max="20" required value={staffBookingForm.guests} onChange={(event) => setStaffBookingForm({ ...staffBookingForm, guests: Number(event.target.value) })} /></label>
      <label>Notes<input maxLength="300" value={staffBookingForm.notes} onChange={(event) => setStaffBookingForm({ ...staffBookingForm, notes: event.target.value })} /></label>
      <button className="button button-copper">Create booking</button>
    </form></details>
    <label className="workspace-search">Search guest, phone, or booking reference<input value={reservationSearch} onChange={(event) => setReservationSearch(event.target.value)} /></label>
    <div className="admin-dish-list">{filteredReservations.map((item) => <article className="reservation-admin" key={item._id}>
      <strong>{item.name} · {item.guests} guests</strong>
      <small>{new Date(item.date).toLocaleDateString()} · {item.time} · {item.phone}</small>
      <small>Ref: {item.bookingReference || 'Legacy booking'} · {item.source || 'online'}</small>
      {item.notes && <small>{item.notes}</small>}
      {item.internalNotes && <small>Staff note: {item.internalNotes}</small>}
      <form className="reservation-edit-form" onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        onUpdateReservation(item, { date: data.get('date'), time: data.get('time') })
      }}>
        <label>Reschedule date<input name="date" type="date" min={minimumReservationDate} defaultValue={new Date(item.date).toISOString().slice(0, 10)} required /></label>
        <label>Time<input name="time" type="time" defaultValue={/^\d{2}:\d{2}$/.test(item.time) ? item.time : ''} required /></label>
        <button className="button button-outline">Reschedule</button>
      </form>
      <label className="workspace-search">Assigned tables<select multiple value={(item.tableIds || []).map(String)} onChange={(event) => onUpdateReservation(item, { tableIds: [...event.target.selectedOptions].map((option) => option.value) })}>
        {tables.filter((table) => table.active).map((table) => <option key={table._id} value={table._id}>{table.label} · {table.section} · {table.capacity} seats</option>)}
      </select></label>
      <div><span className={`reservation-state ${item.status}`}>{item.status.replace('_', ' ')}</span>
        {item.status === 'requested' && <button onClick={() => onStatusChange(item, 'confirmed')}>Confirm</button>}
        {['requested', 'confirmed'].includes(item.status) && <button onClick={() => onStatusChange(item, 'checked_in')}>Check in</button>}
        {item.status === 'checked_in' && <button onClick={() => onStatusChange(item, 'completed')}>Complete</button>}
        {['requested', 'confirmed'].includes(item.status) && <button onClick={() => onStatusChange(item, 'no_show')}>No-show</button>}
        {['requested', 'confirmed'].includes(item.status) && <button onClick={() => onStatusChange(item, 'cancelled')}>Cancel</button>}
      </div>
    </article>)}</div>
  </section>
  if (activeView === 'floor') return <div className="workspace-grid">
    <section className="admin-panel workspace-wide"><h2>Floor plan</h2><p>Table combinations may share a combination group within the same section.</p>
      {user.role === 'admin' && <form className="admin-form inline-admin-form" onSubmit={onAddTable}>
        <label>Table label<input required maxLength="30" value={tableForm.label} onChange={(event) => setTableForm({ ...tableForm, label: event.target.value })} /></label>
        <label>Section<input required maxLength="60" value={tableForm.section} onChange={(event) => setTableForm({ ...tableForm, section: event.target.value })} /></label>
        <label>Seats<input type="number" min="1" max="30" required value={tableForm.capacity} onChange={(event) => setTableForm({ ...tableForm, capacity: Number(event.target.value) })} /></label>
        <label>Combination group (optional)<input maxLength="60" value={tableForm.combinationGroup} onChange={(event) => setTableForm({ ...tableForm, combinationGroup: event.target.value })} /></label>
        <button className="button button-copper">Add table <Plus size={15} /></button>
      </form>}
      <div className="workspace-grid">{tables.map((table) => <TableCard key={`${table._id}-${table.updatedAt}`} table={table} user={user} onSave={onUpdateTable} />)}</div>
      {!tables.length && <p>No tables configured yet. Add table records before taking confirmed bookings.</p>}
    </section>
  </div>
  if (activeView === 'waitlist') return <div className="workspace-grid">
    <section className="admin-panel"><h2>Walk-ins</h2><form className="admin-form" onSubmit={(event) => onAddWalkIn(event, false)}>
      <label>Guest name<input required minLength="2" value={walkInForm.name} onChange={(event) => setWalkInForm({ ...walkInForm, name: event.target.value })} /></label>
      <label>Phone<input required value={walkInForm.phone} onChange={(event) => setWalkInForm({ ...walkInForm, phone: event.target.value })} /></label>
      <label>Date<input type="date" required value={walkInForm.date} onChange={(event) => setWalkInForm({ ...walkInForm, date: event.target.value })} /></label>
      <label>Time<input type="time" required value={walkInForm.time} onChange={(event) => setWalkInForm({ ...walkInForm, time: event.target.value })} /></label>
      <label>Guests<input type="number" min="1" max="20" required value={walkInForm.guests} onChange={(event) => setWalkInForm({ ...walkInForm, guests: Number(event.target.value) })} /></label>
      <label>Notes<input maxLength="300" value={walkInForm.notes} onChange={(event) => setWalkInForm({ ...walkInForm, notes: event.target.value })} /></label>
      <button className="button button-copper">Seat walk-in <ArrowRight size={15} /></button>
    </form><button className="button button-outline" onClick={(event) => onAddWalkIn(event, true)}>Add this party to waitlist</button></section>
    <section className="admin-panel"><h2>Waiting parties <span>{waitlist.length}</span></h2>{waitlist.map((item) => <article className="reservation-admin" key={item._id}>
      <strong>{item.name} · {item.guests} guests</strong><small>{new Date(item.date).toLocaleDateString()} · {item.phone}</small>
      <div><button onClick={() => onUpdateWaitlist(item, 'seated')}>Seat party</button><button onClick={() => onUpdateWaitlist(item, 'cancelled')}>Remove</button></div>
    </article>)}{!waitlist.length && <p>No parties are currently waiting.</p>}</section>
  </div>
  if (activeView === 'customers') {
    const customers = reservations.filter((item) => `${item.name} ${item.phone}`.toLowerCase().includes(customerSearch.toLowerCase()))
    return <section className="admin-panel"><h2>Customer booking history</h2><label className="workspace-search">Search name or phone<input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} /></label>
      {customers.map((item) => <p className="workspace-row" key={item._id}><strong>{item.name} · {item.phone}</strong><span>{new Date(item.date).toLocaleDateString()} · {item.guests} guests · {item.status.replace('_', ' ')}</span></p>)}
      {!customers.length && <p>No matching customer records.</p>}
    </section>
  }
  if (activeView === 'staff') return <div className="workspace-grid">
    <section className="admin-panel"><h2>Create manager account</h2><p>Managers can operate reservations and floor service, but cannot manage staff or global settings.</p>
      <form className="admin-form" onSubmit={onAddStaff}>
        <label>Full name<input required minLength="2" maxLength="100" value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} /></label>
        <label>Email<input type="email" required value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} /></label>
        <label>{editingStaffId ? 'New password (leave blank to keep current)' : 'Temporary password (12+ characters)'}<input type="password" minLength={staffForm.password ? 12 : undefined} required={!editingStaffId} value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password: event.target.value })} /></label>
        <button className="button button-copper" disabled={busy}>{editingStaffId ? 'Save manager' : 'Create manager'}</button>
        {editingStaffId && <button type="button" className="button button-outline" onClick={() => onCancelStaffEdit()}>Cancel edit</button>}
      </form>
    </section>
    <section className="admin-panel"><h2>Staff accounts <span>{staff.length}</span></h2>{staff.map((manager) => <article className="reservation-admin" key={manager._id}>
      <strong>{manager.name}</strong><small>{manager.email}</small><div><span>{manager.active ? 'Active' : 'Inactive'}</span><button onClick={() => onEditStaff(manager)}>Edit</button><button onClick={() => onToggleStaff(manager)}>{manager.active ? 'Deactivate' : 'Reactivate'}</button></div>
    </article>)}</section>
  </div>
  if (activeView === 'reports') return <div className="workspace-grid">
    <section className="admin-panel"><h2>Reservation summary</h2>{['requested', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'].map((status) => <p className="workspace-row" key={status}><strong>{status.replace('_', ' ')}</strong><span>{reservations.filter((item) => item.status === status).length}</span></p>)}</section>
    <section className="admin-panel"><h2>Guest covers by service date</h2>{[...new Set(reservations.map((item) => new Date(item.date).toISOString().slice(0, 10)))].sort().map((date) => <p className="workspace-row" key={date}><strong>{date}</strong><span>{reservations.filter((item) => new Date(item.date).toISOString().slice(0, 10) === date && item.status !== 'cancelled').reduce((total, item) => total + item.guests, 0)} covers</span></p>)}</section>
  </div>
  if (activeView === 'booking') return <section className="admin-panel"><h2>Booking rules</h2><p>Times use the restaurant’s configured local time. Availability requires active table records and opening hours.</p>
    <form className="admin-form" onSubmit={onSaveBookingSettings}>
      <label>Restaurant timezone<input required value={bookingSettings.timezone || 'Asia/Karachi'} onChange={(event) => setBookingSettings({ ...bookingSettings, timezone: event.target.value })} /></label>
      <div className="form-row">{[['slotIntervalMinutes', 'Slot interval'], ['seatingDurationMinutes', 'Seating duration'], ['advanceBookingDays', 'Days in advance'], ['minimumPartySize', 'Minimum party'], ['maximumPartySize', 'Maximum party'], ['cancellationWindowHours', 'Cancellation window hours']].map(([key, label]) => <label key={key}>{label}<input type="number" required min={key.includes('Party') ? 1 : key === 'cancellationWindowHours' ? 0 : 15} value={bookingSettings[key] ?? 0} onChange={(event) => setBookingSettings({ ...bookingSettings, [key]: Number(event.target.value) })} /></label>)}</div>
      <h3>Opening hours</h3>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((label, day) => {
        const entry = bookingSettings.openingHours.find((hours) => hours.day === day)
        return <div className="form-row hours-row" key={label}><label><input type="checkbox" checked={Boolean(entry)} onChange={(event) => setBookingSettings({
          ...bookingSettings,
          openingHours: event.target.checked
            ? [...bookingSettings.openingHours, { day, open: '12:00', close: '23:00' }].sort((left, right) => left.day - right.day)
            : bookingSettings.openingHours.filter((hours) => hours.day !== day),
        })} /> {label}</label>{entry && <><label>Open<input type="time" value={entry.open} onChange={(event) => setBookingSettings({ ...bookingSettings, openingHours: bookingSettings.openingHours.map((hours) => hours.day === day ? { ...hours, open: event.target.value } : hours) })} /></label><label>Close<input type="time" value={entry.close} onChange={(event) => setBookingSettings({ ...bookingSettings, openingHours: bookingSettings.openingHours.map((hours) => hours.day === day ? { ...hours, close: event.target.value } : hours) })} /></label></>}</div>
      })}
      <h3>Special closures</h3><div className="form-row closure-form">
        <label>Date<input type="date" required min={minimumReservationDate} value={closureForm.date} onChange={(event) => setClosureForm({ ...closureForm, date: event.target.value })} /></label>
        <label>Reason<input maxLength="120" value={closureForm.reason} onChange={(event) => setClosureForm({ ...closureForm, reason: event.target.value })} /></label>
        <button type="button" className="button button-outline" disabled={!closureForm.date} onClick={onAddClosure}>Add closure</button>
      </div>
      {(bookingSettings.closures || []).map((closure) => <p className="workspace-row" key={closure.date}><strong>{closure.date}</strong><span>{closure.reason}<button type="button" onClick={() => onRemoveClosure(closure.date)}>Remove</button></span></p>)}
      <button className="button button-copper" disabled={busy}>Save booking rules <Check size={15} /></button>
    </form>
  </section>
  if (activeView === 'activity') return <section className="admin-panel"><h2>Activity log</h2>{activity.map((item) => <p className="workspace-row" key={item._id}><strong>{item.action}</strong><span>{item.actorEmail} · {new Date(item.createdAt).toLocaleString()}</span></p>)}{!activity.length && <p>No recorded activity yet.</p>}</section>
  return null
}

function AdminPage({ dishes, setDishes, categories, setCategories, restaurantConfig, onSettingsChange }) {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [activeView, setActiveView] = useState('overview')
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [form, setForm] = useState({ name: '', category: initialCategories[1], description: '', price: '', image: '', available: true, featured: false })
  const [settings, setSettings] = useState(restaurantConfig)
  const [editingId, setEditingId] = useState('')
  const [categoryRecords, setCategoryRecords] = useState([])
  const [categoryName, setCategoryName] = useState('')
  const [reservations, setReservations] = useState([])
  const [tables, setTables] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [staff, setStaff] = useState([])
  const [activity, setActivity] = useState([])
  const [bookingSettings, setBookingSettings] = useState({
    slotIntervalMinutes: 30, seatingDurationMinutes: 90, advanceBookingDays: 60,
    minimumPartySize: 1, maximumPartySize: 20, cancellationWindowHours: 0,
    timezone: 'Asia/Karachi', openingHours: [], closures: [],
  })
  const [closureForm, setClosureForm] = useState({ date: '', reason: '' })
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '' })
  const [editingStaffId, setEditingStaffId] = useState('')
  const [staffBookingForm, setStaffBookingForm] = useState({
    name: '', phone: '', date: minimumReservationDate, time: currentTime, guests: 2, notes: '',
  })
  const [tableForm, setTableForm] = useState({ label: '', section: 'Main dining', capacity: 2, combinationGroup: '' })
  const [walkInForm, setWalkInForm] = useState({ name: '', phone: '', date: minimumReservationDate, time: currentTime, guests: 2, notes: '' })
  const [customerSearch, setCustomerSearch] = useState('')
  const [reservationSearch, setReservationSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!token) return
    Promise.all([
      request('/categories', { token }),
      request('/reservations', { token }),
      request('/dishes', { token }),
      request('/operations/tables', { token }),
      request('/operations/booking-settings', { token }),
      request('/reservations/waitlist', { token }),
    ])
      .then(async ([loadedCategories, loadedReservations, loadedDishes, loadedTables, loadedBookingSettings, loadedWaitlist]) => {
        setCategoryRecords(loadedCategories)
        if (loadedCategories.length) setCategories(['All', ...loadedCategories.map((category) => category.name)])
        setReservations(loadedReservations)
        setDishes(loadedDishes.map((dish) => ({ ...dish, id: dish._id })))
        setTables(loadedTables)
        setBookingSettings(loadedBookingSettings)
        setWaitlist(loadedWaitlist)
        if (user?.role === 'admin') {
          const [loadedStaff, loadedActivity] = await Promise.all([
            request('/staff', { token }),
            request('/operations/activity', { token }),
          ])
          setStaff(loadedStaff)
          setActivity(loadedActivity)
        }
      })
      .catch((exception) => setError(exception.message))
  }, [token, user, setCategories, setDishes])
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }); setUser(data.user); setToken(data.token); setNotice('Signed in securely.') }
    catch (exception) { setError(exception.message) } finally { setBusy(false) }
  }
  async function saveDish(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const payload = { ...form, price: Number(form.price) }
      const saved = await request(editingId ? `/dishes/${editingId}` : '/dishes', {
        method: editingId ? 'PATCH' : 'POST', token, body: JSON.stringify(payload),
      })
      const mapped = { ...saved, id: saved._id }
      setDishes((current) => editingId
        ? current.map((dish) => dish.id === editingId ? mapped : dish)
        : [...current, mapped])
      setForm({ name: '', category: categories[1] || '', description: '', price: '', image: '', available: true, featured: false })
      setNotice(editingId ? 'Dish updated.' : 'Dish added.')
      setEditingId('')
    } catch (exception) { setError(exception.message) } finally { setBusy(false) }
  }
  async function deleteDish(id) {
    setError(''); setNotice('')
    try { await request(`/dishes/${id}`, { method: 'DELETE', token }); setDishes((items) => items.filter((dish) => dish.id !== id)); setNotice('Dish removed.') }
    catch (exception) { setError(exception.message) }
  }
  async function updateSettings(event) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const saved = await request('/settings', { method: 'PATCH', token, body: JSON.stringify(settings) })
      const nextSettings = {
        ...restaurantConfig, ...saved,
        palette: { ...restaurantConfig.palette, ...saved.palette },
        hero: { ...restaurantConfig.hero, ...saved.hero },
        offer: { ...restaurantConfig.offer, ...saved.offer },
        sections: { ...restaurantConfig.sections, ...saved.sections },
        images: { ...restaurantConfig.images, ...saved.images },
      }
      setSettings(nextSettings)
      onSettingsChange(nextSettings)
      setNotice('Restaurant details saved.')
    }
    catch (exception) { setError(exception.message) }
  }
  async function addCategory(event) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const saved = await request('/categories', { method: 'POST', token, body: JSON.stringify({ name: categoryName }) })
      setCategoryRecords((current) => [...current, saved])
      setCategories((current) => current.includes(saved.name) ? current : [...current, saved.name])
      setCategoryName(''); setNotice('Category added.')
    } catch (exception) { setError(exception.message) }
  }
  async function removeCategory(category) {
    setError(''); setNotice('')
    try {
      await request(`/categories/${category._id}`, { method: 'DELETE', token })
      setCategoryRecords((current) => current.filter((item) => item._id !== category._id))
      setCategories((current) => current.filter((item) => item !== category.name))
      setNotice('Category removed. Existing dishes keep their current category label.')
    } catch (exception) { setError(exception.message) }
  }
  async function changeReservation(reservation, status) {
    try {
      const saved = await request(`/reservations/${reservation._id}`, { method: 'PATCH', token, body: JSON.stringify({ status }) })
      setReservations((current) => current.map((item) => item._id === saved._id ? saved : item))
      setNotice(`Reservation marked ${status.replace('_', ' ')}.`)
    } catch (exception) { setError(exception.message) }
  }
  async function updateReservation(reservation, changes) {
    try {
      const saved = await request(`/reservations/${reservation._id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(changes),
      })
      setReservations((current) => current.map((item) => item._id === saved._id ? saved : item))
      setNotice(changes.tableIds ? 'Table assignment updated.' : 'Reservation updated.')
      setError('')
    } catch (exception) { setError(exception.message) }
  }
  async function addStaffReservation(event) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const saved = await request('/reservations/staff', {
        method: 'POST',
        token,
        body: JSON.stringify(staffBookingForm),
      })
      setReservations((current) => [...current, saved])
      setStaffBookingForm({ name: '', phone: '', date: minimumReservationDate, time: currentTime, guests: 2, notes: '' })
      setNotice(`Reservation created${saved.bookingReference ? ` (${saved.bookingReference})` : ''}.`)
    } catch (exception) { setError(exception.message) }
  }
  async function addStaff(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const body = { ...staffForm }
      if (editingStaffId && !body.password) delete body.password
      const saved = await request(editingStaffId ? `/staff/${editingStaffId}` : '/staff', {
        method: editingStaffId ? 'PATCH' : 'POST', token, body: JSON.stringify(body),
      })
      setStaff((current) => editingStaffId
        ? current.map((item) => item._id === saved._id ? saved : item)
        : [...current, saved])
      setStaffForm({ name: '', email: '', password: '' })
      setEditingStaffId('')
      setNotice(editingStaffId ? 'Manager account updated.' : 'Manager account created.')
    } catch (exception) { setError(exception.message) } finally { setBusy(false) }
  }
  function editStaff(manager) {
    setEditingStaffId(manager._id)
    setStaffForm({ name: manager.name, email: manager.email, password: '' })
  }
  function cancelStaffEdit() {
    setEditingStaffId('')
    setStaffForm({ name: '', email: '', password: '' })
  }
  async function toggleStaff(manager) {
    try {
      const saved = await request(`/staff/${manager._id}`, { method: 'PATCH', token, body: JSON.stringify({ active: !manager.active }) })
      setStaff((current) => current.map((item) => item._id === saved._id ? saved : item))
      setNotice(`Manager ${saved.active ? 'reactivated' : 'deactivated'}.`)
    } catch (exception) { setError(exception.message) }
  }
  async function addTable(event) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const saved = await request('/operations/tables', { method: 'POST', token, body: JSON.stringify(tableForm) })
      setTables((current) => [...current, saved])
      setTableForm({ label: '', section: 'Main dining', capacity: 2, combinationGroup: '' })
      setNotice('Table added to the floor plan.')
    } catch (exception) { setError(exception.message) }
  }
  async function updateTable(table, changes) {
    try {
      const saved = await request(`/operations/tables/${table._id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(changes),
      })
      setTables((current) => current.map((item) => item._id === saved._id ? saved : item))
      setNotice('Table settings updated.')
      setError('')
    } catch (exception) { setError(exception.message) }
  }
  async function saveBookingSettings(event) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const saved = await request('/operations/booking-settings', { method: 'PATCH', token, body: JSON.stringify(bookingSettings) })
      setBookingSettings(saved)
      setNotice('Booking rules saved.')
    } catch (exception) { setError(exception.message) }
  }
  function addClosure() {
    setBookingSettings((current) => ({
      ...current,
      closures: [...(current.closures || []).filter((item) => item.date !== closureForm.date), closureForm],
    }))
    setClosureForm({ date: '', reason: '' })
  }
  function removeClosure(date) {
    setBookingSettings((current) => ({
      ...current,
      closures: (current.closures || []).filter((item) => item.date !== date),
    }))
  }
  async function addWalkIn(event, waitlisted = false) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const path = waitlisted ? '/reservations/waitlist' : '/reservations/walk-ins'
      const saved = await request(path, { method: 'POST', token, body: JSON.stringify(walkInForm) })
      if (waitlisted) setWaitlist((current) => [...current, saved])
      else setReservations((current) => [...current, saved])
      setWalkInForm({ name: '', phone: '', date: minimumReservationDate, time: currentTime, guests: 2, notes: '' })
      setNotice(waitlisted ? 'Party added to the waitlist.' : 'Walk-in party seated.')
    } catch (exception) { setError(exception.message) }
  }
  async function updateWaitlist(entry, status) {
    try {
      const saved = await request(`/reservations/waitlist/${entry._id}`, { method: 'PATCH', token, body: JSON.stringify({ status }) })
      setWaitlist((current) => current.filter((item) => item._id !== saved._id))
      setNotice(status === 'seated' ? 'Waitlisted party has been seated.' : 'Waitlist entry cancelled.')
    } catch (exception) { setError(exception.message) }
  }
  if (!token) return <main className="admin-login"><div className="admin-login-card"><Link to="/" className="text-link"><ArrowRight className="back-arrow" size={15} /> BACK TO RESTAURANT</Link><p className="eyebrow">PRIVATE ACCESS</p><h1>Welcome back.</h1><p>Sign in to manage your restaurant.</p><form onSubmit={login}><label>Email<input type="email" autoComplete="username" required value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} /></label><label>Password<input type="password" autoComplete="current-password" required value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /></label><button className="button button-copper" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button>{!apiConfigured && <p className="form-hint">Configure the API and administrator environment variables before signing in.</p>}{error && <p className="form-status error" role="alert">{error}</p>}</form></div></main>

  const visibleWorkspaceItems = workspaceItems.filter(([, , requiredRole]) => !requiredRole || user?.role === requiredRole)
  return <main className="admin-page">
    <header className="admin-toolbar">
      <Link className="wordmark" to="/"><span className="wordmark-mark">S</span><span>{restaurantConfig.name}<small>ADMINISTRATION</small></span></Link>
      <div className="admin-profile"><span>{user?.name || user?.email} · {user?.role}</span><button className="button button-outline" onClick={() => { setToken(''); setUser(null); navigate('/admin') }}>Sign out</button></div>
    </header>
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand"><span className="wordmark-mark">S</span><span>{restaurantConfig.name}<small>RESTAURANT OS</small></span></div>
        <nav aria-label="Admin workspace">{visibleWorkspaceItems.map(([id, label]) => <button key={id} className={activeView === id ? 'active' : ''} aria-current={activeView === id ? 'page' : undefined} onClick={() => setActiveView(id)}>{label}</button>)}</nav>
      </aside>
      <section className="admin-content">
        <p className="eyebrow">RESTAURANT MANAGEMENT</p><h1>{activeView === 'overview' ? 'Good to see you.' : workspaceItems.find(([id]) => id === activeView)?.[1]}</h1>
        <p className="admin-lede">Manage reservations, service operations, and restaurant details.</p>
        {notice && <p className="form-status success" role="status">{notice}</p>}{error && <p className="form-status error" role="alert">{error}</p>}
        {activeView !== 'menu' && activeView !== 'general' && <AdminWorkspace
          activeView={activeView} user={user} reservations={reservations} tables={tables} waitlist={waitlist}
          staff={staff} activity={activity} bookingSettings={bookingSettings} setBookingSettings={setBookingSettings}
          closureForm={closureForm} setClosureForm={setClosureForm}
          tableForm={tableForm} setTableForm={setTableForm} staffForm={staffForm} setStaffForm={setStaffForm}
          staffBookingForm={staffBookingForm} setStaffBookingForm={setStaffBookingForm}
          walkInForm={walkInForm} setWalkInForm={setWalkInForm} customerSearch={customerSearch}
          setCustomerSearch={setCustomerSearch} reservationSearch={reservationSearch}
          setReservationSearch={setReservationSearch} onStatusChange={changeReservation}
          onUpdateReservation={updateReservation} onAddStaffReservation={addStaffReservation}
          onAddTable={addTable} onUpdateTable={updateTable}
          onAddStaff={addStaff} onToggleStaff={toggleStaff}
          editingStaffId={editingStaffId} onEditStaff={editStaff} onCancelStaffEdit={cancelStaffEdit}
          onSaveBookingSettings={saveBookingSettings} onAddWalkIn={addWalkIn} onUpdateWaitlist={updateWaitlist}
          onAddClosure={addClosure} onRemoveClosure={removeClosure} busy={busy}
        />}
        {(activeView === 'menu' || activeView === 'general') && <>
    <div className="admin-columns"><section className="admin-panel"><h2>Menu items <span>{dishes.length}</span></h2><div className="admin-dish-list">{dishes.map((dish) => <div className="admin-dish" key={dish.id}><img src={dish.image} alt="" /><div><strong>{dish.name}</strong><small>{dish.category} · {formatPrice(dish.price)} · {dish.available ? 'Available' : 'Unavailable'}</small></div><button className="icon-button" onClick={() => { setEditingId(dish.id); setForm({ name: dish.name, category: dish.category, description: dish.description, price: String(dish.price), image: dish.image, available: dish.available, featured: dish.featured }) }} aria-label={`Edit ${dish.name}`}><Check size={16} /></button><button className="icon-button danger" onClick={() => deleteDish(dish.id)} aria-label={`Delete ${dish.name}`}><X size={17} /></button></div>)}</div><h3>{editingId ? 'Edit dish' : 'Add a dish'}</h3><form className="admin-form" onSubmit={saveDish}><label>Dish name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Category<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.filter((category) => category !== 'All').map((category) => <option key={category}>{category}</option>)}</select></label><label>Description<input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label>Price (PKR)<input type="number" min="1" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Image URL<input type="url" required value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label><div className="admin-checks"><label><input type="checkbox" checked={form.available} onChange={(event) => setForm({ ...form, available: event.target.checked })} /> Available</label><label><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Featured</label></div><div className="admin-actions"><button className="button button-copper" disabled={busy}>{editingId ? 'Save dish' : 'Add dish'} <Plus size={16} /></button>{editingId && <button type="button" className="button button-outline" onClick={() => { setEditingId(''); setForm({ name: '', category: categories[1] || '', description: '', price: '', image: '', available: true, featured: false }) }}>Cancel</button>}</div></form></section>
    <section className="admin-panel"><h2>Restaurant details</h2><p>Brand, contact, hours, hero, offer, images, palette, and visible sections.</p><form className="admin-form" onSubmit={updateSettings}>{[['name', 'Restaurant name', 'text'], ['logo', 'Logo image URL (optional)', 'url'], ['locationLabel', 'Location label', 'text'], ['address', 'Address', 'text'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email'], ['whatsapp', 'WhatsApp number', 'text'], ['instagram', 'Instagram URL', 'url']].map(([key, label, type]) => <label key={key}>{label}<input type={type} required={key !== 'logo'} value={settings[key] || ''} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} /></label>)}{[['eyebrow', 'Hero eyebrow'], ['title', 'Hero headline'], ['description', 'Hero description'], ['image', 'Hero image URL']].map(([key, label]) => <label key={key}>{label}<input required value={settings.hero?.[key] || ''} onChange={(event) => setSettings({ ...settings, hero: { ...settings.hero, [key]: event.target.value } })} /></label>)}{[['eyebrow', 'Offer eyebrow'], ['title', 'Offer heading'], ['description', 'Offer details']].map(([key, label]) => <label key={key}>{label}<input required value={settings.offer?.[key] || ''} onChange={(event) => setSettings({ ...settings, offer: { ...settings.offer, [key]: event.target.value } })} /></label>)}<div className="admin-subsection"><h3>Opening hours</h3>{(settings.hours || []).map((entry, index) => <div className="form-row" key={`${entry.days}-${index}`}><label>Days<input value={entry.days} onChange={(event) => setSettings({ ...settings, hours: settings.hours.map((hour, hourIndex) => hourIndex === index ? { ...hour, days: event.target.value } : hour) })} /></label><label>Hours<input value={entry.hours} onChange={(event) => setSettings({ ...settings, hours: settings.hours.map((hour, hourIndex) => hourIndex === index ? { ...hour, hours: event.target.value } : hour) })} /></label></div>)}</div><div className="admin-subsection"><h3>Restaurant images</h3><label>Story image URL<input type="url" required value={settings.images?.story || ''} onChange={(event) => setSettings({ ...settings, images: { ...settings.images, story: event.target.value } })} /></label>{(settings.images?.gallery || []).map((image, index) => <label key={`gallery-${index}`}>Gallery image {index + 1}<input type="url" required value={image} onChange={(event) => setSettings({ ...settings, images: { ...settings.images, gallery: settings.images.gallery.map((url, imageIndex) => imageIndex === index ? event.target.value : url) } })} /></label>)}</div><div className="palette-fields">{Object.entries(settings.palette || {}).map(([key, color]) => <label key={key}>{key}<input type="color" value={color} onChange={(event) => setSettings({ ...settings, palette: { ...settings.palette, [key]: event.target.value } })} /></label>)}</div><div className="admin-subsection"><h3>Visible sections</h3><div className="admin-checks section-checks">{Object.entries(settings.sections || {}).map(([key, visible]) => <label key={key}><input type="checkbox" checked={visible} onChange={(event) => setSettings({ ...settings, sections: { ...settings.sections, [key]: event.target.checked } })} /> {key}</label>)}</div></div><button className="button button-copper">Save details <Check size={16} /></button></form></section></div>
    <div className="admin-columns"><section className="admin-panel"><h2>Additional customization</h2><p>Adjust your logo, offer, hours, images, and visible sections.</p><form className="admin-form" onSubmit={updateSettings}><label>Logo image URL<input type="url" value={settings.logo || ''} onChange={(event) => setSettings({ ...settings, logo: event.target.value })} /></label>{[['eyebrow', 'Offer eyebrow'], ['title', 'Offer heading'], ['description', 'Offer details']].map(([key, label]) => <label key={key}>{label}<input value={settings.offer?.[key] || ''} onChange={(event) => setSettings({ ...settings, offer: { ...settings.offer, [key]: event.target.value } })} /></label>)}<h3>Opening hours</h3>{(settings.hours || []).map((entry, index) => <div className="form-row" key={`${entry.days}-${index}`}><label>Days<input value={entry.days} onChange={(event) => setSettings({ ...settings, hours: settings.hours.map((hour, hourIndex) => hourIndex === index ? { ...hour, days: event.target.value } : hour) })} /></label><label>Hours<input value={entry.hours} onChange={(event) => setSettings({ ...settings, hours: settings.hours.map((hour, hourIndex) => hourIndex === index ? { ...hour, hours: event.target.value } : hour) })} /></label></div>)}<h3>Restaurant images</h3><label>Story image<input type="url" value={settings.images?.story || ''} onChange={(event) => setSettings({ ...settings, images: { ...settings.images, story: event.target.value } })} /></label>{(settings.images?.gallery || []).map((image, index) => <label key={`gallery-${index}`}>Gallery image {index + 1}<input type="url" value={image} onChange={(event) => setSettings({ ...settings, images: { ...settings.images, gallery: settings.images.gallery.map((url, imageIndex) => imageIndex === index ? event.target.value : url) } })} /></label>)}<h3>Visible sections</h3><div className="admin-checks section-checks">{Object.entries(settings.sections || {}).map(([key, visible]) => <label key={key}><input type="checkbox" checked={visible} onChange={(event) => setSettings({ ...settings, sections: { ...settings.sections, [key]: event.target.checked } })} /> {key}</label>)}</div><button className="button button-copper">Save customization <Check size={16} /></button></form></section>
    <section className="admin-panel"><h2>Menu categories</h2><form className="category-admin-form" onSubmit={addCategory}><input aria-label="New category name" required minLength="2" maxLength="60" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category" /><button className="button button-copper">Add <Plus size={15} /></button></form><div className="admin-dish-list">{categoryRecords.map((category) => <div className="admin-dish category-row" key={category._id}><strong>{category.name}</strong><button className="icon-button danger" onClick={() => removeCategory(category)} aria-label={`Delete ${category.name}`}><X size={17} /></button></div>)}</div></section>
    <section className="admin-panel"><h2>Reservations <span>{reservations.length}</span></h2>{reservations.length ? <div className="admin-dish-list">{reservations.map((reservation) => <article className="reservation-admin" key={reservation._id}><strong>{reservation.name} · {reservation.guests} guests</strong><small>{new Date(reservation.date).toLocaleDateString()} · {reservation.time} · {reservation.phone}</small>{reservation.notes && <small>{reservation.notes}</small>}<div><span className={`reservation-state ${reservation.status}`}>{reservation.status}</span><button onClick={() => changeReservation(reservation, 'confirmed')}>Confirm</button><button onClick={() => changeReservation(reservation, 'cancelled')}>Cancel</button></div></article>)}</div> : <p>No reservations have been received.</p>}</section></div>
        </>}
        <p className="admin-security-note">Admin changes require a valid staff token. Managers cannot access administrator-only settings.</p>
      </section>
    </div>
  </main>
}

export default function App() {
  const location = useLocation()
  const [dishes, setDishes] = useState(initialDishes)
  const [categories, setCategories] = useState(initialCategories)
  const [restaurantConfig, setRestaurantConfig] = useState(restaurant)
  const [cart, setCart] = useState({})
  const [cartOpen, setCartOpen] = useState(false)
  const [cartToast, setCartToast] = useState(null)
  const [apiNotice, setApiNotice] = useState('')
  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0)
  useEffect(() => {
    if (!cartToast) return
    const timeout = window.setTimeout(() => setCartToast(null), 2800)
    return () => window.clearTimeout(timeout)
  }, [cartToast])
  useEffect(() => {
    const targetId = location.hash.slice(1)
    if (targetId) document.getElementById(targetId)?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, [location.key, location.pathname, location.hash])
  useEffect(() => {
    if (!apiConfigured) return
    Promise.all([request('/dishes'), request('/categories'), request('/settings')]).then(([remoteDishes, remoteCategories, remoteSettings]) => {
      if (remoteDishes.length) setDishes(remoteDishes.map((dish) => ({ ...dish, id: dish._id })))
      if (remoteCategories.length) setCategories(['All', ...remoteCategories.map((category) => category.name)])
      if (Object.keys(remoteSettings).length) {
        setRestaurantConfig((current) => ({
          ...current, ...remoteSettings,
          palette: { ...current.palette, ...remoteSettings.palette },
          hero: { ...current.hero, ...remoteSettings.hero },
          offer: { ...current.offer, ...remoteSettings.offer },
          sections: { ...current.sections, ...remoteSettings.sections },
          images: { ...current.images, ...remoteSettings.images },
        }))
      }
    }).catch((error) => setApiNotice(`Using the sample menu because the restaurant API could not be reached: ${error.message}`))
  }, [])
  useEffect(() => {
    Object.entries(restaurantConfig.palette).forEach(([key, value]) => {
      const variable = { ink: '--ink', panel: '--panel', ivory: '--ivory', muted: '--muted', copper: '--copper' }[key]
      if (variable) document.documentElement.style.setProperty(variable, value)
    })
    document.title = `${restaurantConfig.name} — ${restaurantConfig.locationLabel}`
    const description = document.querySelector('meta[name="description"]')
    if (description) description.content = `${restaurantConfig.name}: ${restaurantConfig.hero.description}`
  }, [restaurantConfig])
  const addToCart = (dish) => {
    setCart((current) => ({ ...current, [dish.id]: { ...dish, quantity: (current[dish.id]?.quantity || 0) + 1 } }))
    setCartToast((current) => ({ id: (current?.id || 0) + 1, message: `Added ${dish.name} to your bag` }))
  }
  const updateQuantity = (id, amount) => setCart((current) => {
    const quantity = (current[id]?.quantity || 0) + amount
    if (quantity <= 0) { const next = { ...current }; delete next[id]; return next }
    return { ...current, [id]: { ...current[id], quantity } }
  })
  async function reserve(form) {
    if (!apiConfigured) throw new Error('Online reservations are not connected yet. Please call us to confirm your table.')
    return request('/reservations', { method: 'POST', body: JSON.stringify(form) })
  }
  return <Routes>
    <Route path="/admin" element={<AdminPage dishes={dishes} setDishes={setDishes} categories={categories} setCategories={setCategories} restaurantConfig={restaurantConfig} onSettingsChange={setRestaurantConfig} />} />
    <Route path="/developers" element={<><Header cartCount={cartCount} onCart={() => setCartOpen(true)} restaurantConfig={restaurantConfig} /><DevelopersPage /><Footer restaurantConfig={restaurantConfig} /><CartOrderButton cart={cart} restaurantConfig={restaurantConfig} /><DeveloperChatButton /><CartToast toast={cartToast} />{cartOpen && <CartDrawer cart={cart} onClose={() => setCartOpen(false)} onQuantity={updateQuantity} restaurantConfig={restaurantConfig} />}</>} />
    <Route path="*" element={<><Header cartCount={cartCount} onCart={() => setCartOpen(true)} restaurantConfig={restaurantConfig} />{apiNotice && <div className="api-notice" role="status">{apiNotice}</div>}<HomePage dishes={dishes} categories={categories} onAdd={addToCart} onReserve={reserve} restaurantConfig={restaurantConfig} /><Footer restaurantConfig={restaurantConfig} /><CartOrderButton cart={cart} restaurantConfig={restaurantConfig} /><DeveloperChatButton /><CartToast toast={cartToast} />{cartOpen && <CartDrawer cart={cart} onClose={() => setCartOpen(false)} onQuantity={updateQuantity} restaurantConfig={restaurantConfig} />}</>} />
  </Routes>
}
