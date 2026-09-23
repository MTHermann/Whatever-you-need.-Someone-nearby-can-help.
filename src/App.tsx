import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'
import {
  areas,
  bookingTimeSlots,
  createRequest,
  createSeedProviders,
  defaultBookingSlot,
  findNearbyProviders,
  getProviderSummary,
  markRequestPaid,
  serviceCategories,
  storageKey,
  updateRequestStatus,
  type PaymentMethod,
  type Provider,
  type ProviderAvailability,
  type ServiceCategory,
  type ServiceRequest,
  type ServiceRequestMode,
  type ServiceRequestStatus,
} from './lib/platform'

type Area = (typeof areas)[number]
type ViewMode = 'customer' | 'provider' | 'admin'
type ProfileRole = ViewMode

interface UserProfile {
  name: string
  email: string
  role: ProfileRole
}

interface NotificationItem {
  id: string
  message: string
  createdAt: string
}

const loadStoredProviders = () => {
  if (typeof window === 'undefined') {
    return createSeedProviders()
  }

  const stored = window.localStorage.getItem(storageKey.providers)
  if (!stored) {
    return createSeedProviders()
  }

  try {
    return JSON.parse(stored) as Provider[]
  } catch {
    return createSeedProviders()
  }
}

const loadStoredRequests = () => {
  if (typeof window === 'undefined') {
    return [] as ServiceRequest[]
  }

  const stored = window.localStorage.getItem(storageKey.requests)
  if (!stored) {
    return [] as ServiceRequest[]
  }

  try {
    return JSON.parse(stored) as ServiceRequest[]
  } catch {
    return [] as ServiceRequest[]
  }
}

const loadStoredProfile = () => {
  if (typeof window === 'undefined') {
    return null as UserProfile | null
  }

  const stored = window.localStorage.getItem(storageKey.profile)
  if (!stored) {
    return null as UserProfile | null
  }

  try {
    return JSON.parse(stored) as UserProfile
  } catch {
    return null as UserProfile | null
  }
}

function App() {
  const [view, setView] = useState<ViewMode>('customer')
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory>('plumbers')
  const [selectedLocation, setSelectedLocation] = useState<Area>(areas[0])
  const [bookingDate, setBookingDate] = useState(defaultBookingSlot.slice(0, 10))
  const [bookingTime, setBookingTime] = useState(defaultBookingSlot.slice(11, 16))
  const [providers, setProviders] = useState<Provider[]>(loadStoredProviders)
  const [requests, setRequests] = useState<ServiceRequest[]>(loadStoredRequests)
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [providerName, setProviderName] = useState('')
  const [providerCategory, setProviderCategory] =
    useState<ServiceCategory>('plumbers')
  const [providerLocation, setProviderLocation] = useState<Area>(areas[0])
  const [providerAvailability, setProviderAvailability] =
    useState<ProviderAvailability>('available')
  const [providerPhone, setProviderPhone] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState<
    ProviderAvailability | 'any'
  >('any')
  const [minRating, setMinRating] = useState(4)
  const [maxDistance, setMaxDistance] = useState(15)
  const [sortBy, setSortBy] = useState<'eta' | 'nearest' | 'rating'>('eta')
  const [profile, setProfile] = useState<UserProfile | null>(loadStoredProfile)
  const [loginName, setLoginName] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginRole, setLoginRole] = useState<ProfileRole>('customer')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [paymentMethodsByRequest, setPaymentMethodsByRequest] = useState<
    Record<string, PaymentMethod>
  >({})

  useEffect(() => {
    window.localStorage.setItem(storageKey.providers, JSON.stringify(providers))
  }, [providers])

  useEffect(() => {
    window.localStorage.setItem(storageKey.requests, JSON.stringify(requests))
  }, [requests])

  useEffect(() => {
    if (!profile) {
      window.localStorage.removeItem(storageKey.profile)
      return
    }

    window.localStorage.setItem(storageKey.profile, JSON.stringify(profile))
  }, [profile])

  const activeProviderId = selectedProviderId || providers[0]?.id || ''

  const nearbyProviders = useMemo(
    () =>
      findNearbyProviders(providers, selectedCategory, selectedLocation, {
        availability: availabilityFilter,
        minRating,
        maxDistanceKm: maxDistance,
        sortBy,
      }),
    [
      providers,
      selectedCategory,
      selectedLocation,
      availabilityFilter,
      minRating,
      maxDistance,
      sortBy,
    ],
  )

  const providerDashboard = useMemo(
    () => providers.find((provider) => provider.id === activeProviderId),
    [activeProviderId, providers],
  )

  const providerRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.providerId === activeProviderId ||
          request.providerName === providerDashboard?.name,
      ),
    [activeProviderId, providerDashboard?.name, requests],
  )

  const providerSummary = useMemo(
    () => getProviderSummary(providerDashboard, providerRequests),
    [providerDashboard, providerRequests],
  )

  const customerRequests = useMemo(
    () =>
      requests
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [requests],
  )

  const adminMetrics = useMemo(() => {
    const totalRevenue = requests
      .filter((request) => request.paymentStatus === 'paid')
      .reduce((total, request) => total + request.priceEstimate, 0)

    return {
      totalProviders: providers.length,
      totalRequests: requests.length,
      openRequests: requests.filter((request) =>
        ['pending', 'accepted', 'in-progress'].includes(request.status),
      ).length,
      completedRequests: requests.filter((request) => request.status === 'completed')
        .length,
      paidRevenue: totalRevenue,
    }
  }, [providers.length, requests])

  const addNotification = (message: string) => {
    setNotifications((current) => [
      {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ])
  }

  const submitRequest = (provider: Provider, mode: ServiceRequestMode) => {
    if (!profile) {
      addNotification('Sign in to place service requests.')
      return
    }

    const nextRequest = createRequest({
      category: selectedCategory,
      location: selectedLocation,
      mode,
      provider,
      scheduledFor: mode === 'book-later' ? `${bookingDate}T${bookingTime}` : undefined,
    })

    setRequests((current) => [nextRequest, ...current])
    addNotification(
      `${provider.name} received your ${mode === 'help-now' ? 'Help Now' : 'Book for Later'} request.`,
    )
    setView('customer')
  }

  const registerProvider = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextProvider: Provider = {
      id: crypto.randomUUID(),
      name: providerName.trim(),
      category: providerCategory,
      location: providerLocation,
      phone: providerPhone.trim() || 'On file',
      rating: 4.7,
      etaMinutes: providerAvailability === 'available' ? 18 : 40,
      distanceKm: 2.5,
      hourlyRate: 420,
      availability: providerAvailability,
      completedJobs: 0,
    }

    setProviders((current) => [nextProvider, ...current])
    setSelectedProviderId(nextProvider.id)
    setProviderName('')
    setProviderPhone('')
    setProviderAvailability('available')
    addNotification(`Provider profile created for ${nextProvider.name}.`)
    setView('provider')
  }

  const changeRequestStatus = (
    requestId: string,
    status: ServiceRequestStatus,
  ) => {
    setRequests((current) =>
      current.map((request) => updateRequestStatus(request, requestId, status)),
    )

    const target = requests.find((request) => request.id === requestId)
    if (target) {
      addNotification(`Request with ${target.providerName} is now ${status}.`)
    }
  }

  const payRequest = (requestId: string) => {
    const method = paymentMethodsByRequest[requestId] ?? 'card'

    setRequests((current) =>
      current.map((request) => markRequestPaid(request, requestId, method)),
    )

    const target = requests.find((request) => request.id === requestId)
    if (target) {
      addNotification(`Payment received for ${target.providerName} via ${method}.`)
    }
  }

  const updateProviderAvailability = (
    providerId: string,
    availability: ProviderAvailability,
  ) => {
    setProviders((current) =>
      current.map((provider) =>
        provider.id === providerId ? { ...provider, availability } : provider,
      ),
    )
  }

  const signIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextProfile: UserProfile = {
      name: loginName.trim(),
      email: loginEmail.trim(),
      role: loginRole,
    }

    setProfile(nextProfile)
    setLoginName('')
    setLoginEmail('')
    setView(nextProfile.role)
    addNotification(`Signed in as ${nextProfile.name} (${nextProfile.role}).`)
  }

  const signOut = () => {
    const name = profile?.name
    setProfile(null)
    setView('customer')
    addNotification(name ? `${name} signed out.` : 'Signed out.')
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <span className="eyebrow">On-demand services marketplace</span>
          <h1>Whatever you need, someone nearby can help.</h1>
          <p className="hero-copy">
            Request local plumbers, electricians, cleaners, roadside support,
            locksmiths, and more in minutes through a single responsive app.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={() => setView('customer')}>
              Explore as customer
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setView('provider')}
            >
              Join as provider
            </button>
          </div>
        </div>
        <div className="hero-stats">
          <article>
            <strong>{serviceCategories.length}</strong>
            <span>service categories</span>
          </article>
          <article>
            <strong>{providers.length}</strong>
            <span>registered providers</span>
          </article>
          <article>
            <strong>{requests.length}</strong>
            <span>tracked requests</span>
          </article>
        </div>
      </header>

      <section className="card auth-card">
        <div className="section-heading">
          <div>
            <h2>Account</h2>
            <p>Sign in to place requests, switch roles, and track your activity.</p>
          </div>
          {profile ? (
            <button type="button" className="secondary" onClick={signOut}>
              Sign out
            </button>
          ) : null}
        </div>
        {profile ? (
          <p>
            Signed in as <strong>{profile.name}</strong> ({profile.email}) — role:{' '}
            <strong>{profile.role}</strong>
          </p>
        ) : (
          <form className="stack auth-form" onSubmit={signIn}>
            <label>
              Name
              <input
                required
                value={loginName}
                onChange={(event) => setLoginName(event.target.value)}
                placeholder="Alex"
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="alex@example.com"
              />
            </label>
            <label>
              Role
              <select
                value={loginRole}
                onChange={(event) => setLoginRole(event.target.value as ProfileRole)}
              >
                <option value="customer">customer</option>
                <option value="provider">provider</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button type="submit">Sign in</button>
          </form>
        )}
      </section>

      <nav className="mode-switch" aria-label="Platform views">
        <button
          type="button"
          className={view === 'customer' ? 'active' : ''}
          onClick={() => setView('customer')}
        >
          Customer
        </button>
        <button
          type="button"
          className={view === 'provider' ? 'active' : ''}
          onClick={() => setView('provider')}
        >
          Provider
        </button>
        <button
          type="button"
          className={view === 'admin' ? 'active' : ''}
          onClick={() => setView('admin')}
        >
          Admin
        </button>
      </nav>

      <main className="content-grid">
        <section className="card landing-card">
          <h2>Supported services</h2>
          <div className="category-pills">
            {serviceCategories.map((category) => (
              <span key={category}>{category}</span>
            ))}
          </div>
          <p>
            The platform now includes sign-in, provider filtering, booking slot
            selection, request notifications, mocked payments, and an admin view.
          </p>
        </section>

        {view === 'customer' ? (
          <>
            <section className="card">
              <h2>Find nearby help</h2>
              <label>
                Service category
                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(event.target.value as ServiceCategory)
                  }
                >
                  {serviceCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Location
                <select
                  value={selectedLocation}
                  onChange={(event) =>
                    setSelectedLocation(event.target.value as Area)
                  }
                >
                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Book-for-later date
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(event) => setBookingDate(event.target.value)}
                />
              </label>
              <label>
                Book-for-later time slot
                <select
                  value={bookingTime}
                  onChange={(event) => setBookingTime(event.target.value)}
                >
                  {bookingTimeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="card">
              <h2>Provider filters</h2>
              <label>
                Availability
                <select
                  value={availabilityFilter}
                  onChange={(event) =>
                    setAvailabilityFilter(
                      event.target.value as ProviderAvailability | 'any',
                    )
                  }
                >
                  <option value="any">any</option>
                  <option value="available">available</option>
                  <option value="busy">busy</option>
                  <option value="offline">offline</option>
                </select>
              </label>
              <label>
                Minimum rating ({minRating.toFixed(1)})
                <input
                  min={3.5}
                  max={5}
                  step={0.1}
                  type="range"
                  value={minRating}
                  onChange={(event) => setMinRating(Number(event.target.value))}
                />
              </label>
              <label>
                Max distance ({maxDistance} km)
                <input
                  min={1}
                  max={25}
                  type="range"
                  value={maxDistance}
                  onChange={(event) => setMaxDistance(Number(event.target.value))}
                />
              </label>
              <label>
                Sort by
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as 'eta' | 'nearest' | 'rating')
                  }
                >
                  <option value="eta">ETA</option>
                  <option value="nearest">distance</option>
                  <option value="rating">rating</option>
                </select>
              </label>
            </section>

            <section className="card">
              <div className="section-heading">
                <div>
                  <h2>Nearby providers</h2>
                  <p>
                    {nearbyProviders.length} providers match your category and
                    filters.
                  </p>
                </div>
              </div>
              <div className="provider-grid">
                {nearbyProviders.map((provider) => (
                  <article key={provider.id} className="provider-card">
                    <div className="provider-card__header">
                      <div>
                        <h3>{provider.name}</h3>
                        <p>{provider.location}</p>
                      </div>
                      <span className="badge">{provider.availability}</span>
                    </div>
                    <dl>
                      <div>
                        <dt>ETA</dt>
                        <dd>{provider.etaMinutes} min</dd>
                      </div>
                      <div>
                        <dt>Rating</dt>
                        <dd>{provider.rating.toFixed(1)} / 5</dd>
                      </div>
                      <div>
                        <dt>Distance</dt>
                        <dd>{provider.distanceKm.toFixed(1)} km</dd>
                      </div>
                      <div>
                        <dt>Rate</dt>
                        <dd>R{provider.hourlyRate}/hr</dd>
                      </div>
                    </dl>
                    <div className="card-actions">
                      <button
                        type="button"
                        onClick={() => submitRequest(provider, 'help-now')}
                      >
                        Help Now
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => submitRequest(provider, 'book-later')}
                      >
                        Book for Later
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card">
              <h2>Request status & payments</h2>
              <div className="request-list">
                {customerRequests.length === 0 ? (
                  <p>No requests yet. Choose a provider to get started.</p>
                ) : (
                  customerRequests.map((request) => (
                    <article key={request.id} className="request-card">
                      <div className="request-card__header">
                        <div>
                          <h3>{request.category}</h3>
                          <p>
                            {request.providerName} • {request.location}
                          </p>
                        </div>
                        <span className={`status status--${request.status}`}>
                          {request.status}
                        </span>
                      </div>
                      <p>
                        {request.mode === 'help-now'
                          ? 'Immediate assistance requested.'
                          : `Scheduled for ${request.scheduledFor}.`}
                      </p>
                      <p>
                        Payment: <strong>{request.paymentStatus}</strong>
                        {request.paymentMethod
                          ? ` (${request.paymentMethod})`
                          : null}
                      </p>
                      {request.status === 'completed' &&
                      request.paymentStatus === 'unpaid' ? (
                        <div className="card-actions">
                          <select
                            value={paymentMethodsByRequest[request.id] ?? 'card'}
                            onChange={(event) =>
                              setPaymentMethodsByRequest((current) => ({
                                ...current,
                                [request.id]: event.target.value as PaymentMethod,
                              }))
                            }
                          >
                            <option value="card">card</option>
                            <option value="cash">cash</option>
                            <option value="wallet">wallet</option>
                          </select>
                          <button type="button" onClick={() => payRequest(request.id)}>
                            Pay now (mock)
                          </button>
                        </div>
                      ) : null}
                      <small>
                        Created {new Date(request.createdAt).toLocaleString()}
                      </small>
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        ) : null}

        {view === 'provider' ? (
          <>
            <section className="card">
              <h2>Register as a provider</h2>
              <form className="stack" onSubmit={registerProvider}>
                <label>
                  Business or provider name
                  <input
                    required
                    value={providerName}
                    onChange={(event) => setProviderName(event.target.value)}
                    placeholder="Nearby Rescue Co."
                  />
                </label>
                <label>
                  Service category
                  <select
                    value={providerCategory}
                    onChange={(event) =>
                      setProviderCategory(event.target.value as ServiceCategory)
                    }
                  >
                    {serviceCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Service area
                  <select
                    value={providerLocation}
                    onChange={(event) => setProviderLocation(event.target.value as Area)}
                  >
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Contact phone
                  <input
                    value={providerPhone}
                    onChange={(event) => setProviderPhone(event.target.value)}
                    placeholder="+27 82 000 0000"
                  />
                </label>
                <label>
                  Availability
                  <select
                    value={providerAvailability}
                    onChange={(event) =>
                      setProviderAvailability(
                        event.target.value as ProviderAvailability,
                      )
                    }
                  >
                    <option value="available">available</option>
                    <option value="busy">busy</option>
                    <option value="offline">offline</option>
                  </select>
                </label>
                <button type="submit">Register provider</button>
              </form>
            </section>

            <section className="card">
              <div className="section-heading">
                <div>
                  <h2>Provider dashboard</h2>
                  <p>Manage requests, status changes, availability, and earnings.</p>
                </div>
                <label className="compact-label">
                  Active profile
                  <select
                    value={activeProviderId}
                    onChange={(event) => setSelectedProviderId(event.target.value)}
                  >
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} — {provider.category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {providerDashboard ? (
                <>
                  <div className="summary-grid">
                    <article>
                      <span>Availability</span>
                      <strong>{providerDashboard.availability}</strong>
                    </article>
                    <article>
                      <span>Open jobs</span>
                      <strong>{providerSummary.openJobs}</strong>
                    </article>
                    <article>
                      <span>Completed jobs</span>
                      <strong>{providerSummary.completedJobs}</strong>
                    </article>
                    <article>
                      <span>Estimated earnings</span>
                      <strong>R{providerSummary.earnings}</strong>
                    </article>
                  </div>

                  <div className="request-list">
                    {providerRequests.length === 0 ? (
                      <p>No incoming requests for this provider yet.</p>
                    ) : (
                      providerRequests.map((request) => (
                        <article key={request.id} className="request-card">
                          <div className="request-card__header">
                            <div>
                              <h3>{request.category}</h3>
                              <p>
                                {request.mode === 'help-now'
                                  ? 'Help Now'
                                  : `Booked for ${request.scheduledFor}`}
                              </p>
                            </div>
                            <span className={`status status--${request.status}`}>
                              {request.status}
                            </span>
                          </div>
                          <p>
                            {request.location} • Estimate R{request.priceEstimate}
                          </p>
                          <div className="card-actions">
                            {request.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeRequestStatus(request.id, 'accepted')
                                  }
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() =>
                                    changeRequestStatus(request.id, 'declined')
                                  }
                                >
                                  Decline
                                </button>
                              </>
                            ) : null}
                            {request.status === 'accepted' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  changeRequestStatus(request.id, 'in-progress')
                                }
                              >
                                Start job
                              </button>
                            ) : null}
                            {request.status === 'in-progress' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  changeRequestStatus(request.id, 'completed')
                                }
                              >
                                Mark complete
                              </button>
                            ) : null}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p>Register or choose a provider profile to manage requests.</p>
              )}
            </section>
          </>
        ) : null}

        {view === 'admin' ? (
          <>
            <section className="card">
              <h2>Admin dashboard</h2>
              <div className="summary-grid">
                <article>
                  <span>Total providers</span>
                  <strong>{adminMetrics.totalProviders}</strong>
                </article>
                <article>
                  <span>Total requests</span>
                  <strong>{adminMetrics.totalRequests}</strong>
                </article>
                <article>
                  <span>Open requests</span>
                  <strong>{adminMetrics.openRequests}</strong>
                </article>
                <article>
                  <span>Completed requests</span>
                  <strong>{adminMetrics.completedRequests}</strong>
                </article>
                <article>
                  <span>Paid revenue</span>
                  <strong>R{adminMetrics.paidRevenue}</strong>
                </article>
              </div>
            </section>

            <section className="card">
              <h2>Provider controls</h2>
              <div className="request-list">
                {providers.map((provider) => (
                  <article key={provider.id} className="request-card">
                    <div className="request-card__header">
                      <div>
                        <h3>{provider.name}</h3>
                        <p>
                          {provider.category} • {provider.location}
                        </p>
                      </div>
                      <span className="badge">{provider.availability}</span>
                    </div>
                    <label>
                      Availability
                      <select
                        value={provider.availability}
                        onChange={(event) =>
                          updateProviderAvailability(
                            provider.id,
                            event.target.value as ProviderAvailability,
                          )
                        }
                      >
                        <option value="available">available</option>
                        <option value="busy">busy</option>
                        <option value="offline">offline</option>
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}

        <section className="card landing-card">
          <h2>Notifications</h2>
          <div className="request-list">
            {notifications.length === 0 ? (
              <p>No notifications yet.</p>
            ) : (
              notifications.slice(0, 8).map((note) => (
                <article key={note.id} className="request-card">
                  <p>{note.message}</p>
                  <small>{new Date(note.createdAt).toLocaleString()}</small>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
