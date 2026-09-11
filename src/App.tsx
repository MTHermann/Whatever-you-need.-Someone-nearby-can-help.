import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'
import {
  areas,
  createRequest,
  createSeedProviders,
  defaultBookingSlot,
  findNearbyProviders,
  getProviderSummary,
  serviceCategories,
  storageKey,
  updateRequestStatus,
  type Provider,
  type ProviderAvailability,
  type ServiceCategory,
  type ServiceRequest,
  type ServiceRequestMode,
  type ServiceRequestStatus,
} from './lib/platform'

type Area = (typeof areas)[number]
type ViewMode = 'customer' | 'provider'

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

function App() {
  const [view, setView] = useState<ViewMode>('customer')
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory>('plumbers')
  const [selectedLocation, setSelectedLocation] = useState<Area>(areas[0])
  const [bookingSlot, setBookingSlot] = useState(defaultBookingSlot)
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

  useEffect(() => {
    window.localStorage.setItem(storageKey.providers, JSON.stringify(providers))
  }, [providers])

  useEffect(() => {
    window.localStorage.setItem(storageKey.requests, JSON.stringify(requests))
  }, [requests])

  const activeProviderId = selectedProviderId || providers[0]?.id || ''

  const nearbyProviders = useMemo(
    () => findNearbyProviders(providers, selectedCategory, selectedLocation),
    [providers, selectedCategory, selectedLocation],
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

  const submitRequest = (provider: Provider, mode: ServiceRequestMode) => {
    const nextRequest = createRequest({
      category: selectedCategory,
      location: selectedLocation,
      mode,
      provider,
      scheduledFor: mode === 'book-later' ? bookingSlot : undefined,
    })

    setRequests((current) => [nextRequest, ...current])
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
      hourlyRate: 420,
      availability: providerAvailability,
      completedJobs: 0,
    }

    setProviders((current) => [nextProvider, ...current])
    setSelectedProviderId(nextProvider.id)
    setProviderName('')
    setProviderPhone('')
    setProviderAvailability('available')
    setView('provider')
  }

  const changeRequestStatus = (
    requestId: string,
    status: ServiceRequestStatus,
  ) => {
    setRequests((current) =>
      current.map((request) => updateRequestStatus(request, requestId, status)),
    )
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
            The platform is ready for backend integration later, but already
            demonstrates customer requests, provider registration, job tracking,
            and earnings with local persistence.
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
                Book-for-later slot
                <input
                  type="datetime-local"
                  value={bookingSlot}
                  onChange={(event) => setBookingSlot(event.target.value)}
                />
              </label>
            </section>

            <section className="card">
              <div className="section-heading">
                <div>
                  <h2>Nearby providers</h2>
                  <p>
                    {nearbyProviders.length} providers match your category and
                    area.
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
              <h2>Request status</h2>
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
                      <small>
                        Created {new Date(request.createdAt).toLocaleString()}
                      </small>
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        ) : (
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
                    onChange={(event) =>
                    setProviderLocation(event.target.value as Area)
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
        )}
      </main>
    </div>
  )
}

export default App
