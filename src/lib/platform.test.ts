import { describe, expect, it } from 'vitest'
import {
  canCancelRequest,
  createRequest,
  createSeedProviders,
  findNearbyProviders,
  getProviderSummary,
  markRequestPaid,
  openRequestStatuses,
  updateRequestStatus,
} from './platform'

describe('platform helpers', () => {
  it('prioritises matching-area providers for nearby search', () => {
    const providers = createSeedProviders()
    const results = findNearbyProviders(
      providers,
      'roadside assistance',
      'City Centre',
    )

    expect(results[0]?.name).toBe('Road Guard Assist')
  })

  it('applies provider filters and nearest sorting', () => {
    const providers = createSeedProviders()
    const results = findNearbyProviders(providers, 'jump starts', 'Northside', {
      availability: 'available',
      maxDistanceKm: 3,
      minRating: 4.6,
      sortBy: 'nearest',
    })

    expect(results.length).toBe(1)
    expect(results[0]?.name).toBe('Ignite Jump Starts')
  })

  it('creates book-later requests with pending status and schedule', () => {
    const provider = createSeedProviders()[0]
    const request = createRequest({
      category: provider.category,
      location: provider.location,
      mode: 'book-later',
      provider,
      scheduledFor: '2026-09-12T10:00',
    })

    expect(request.status).toBe('pending')
    expect(request.scheduledFor).toBe('2026-09-12T10:00')
    expect(request.paymentStatus).toBe('unpaid')
    expect(request.providerId).toBe(provider.id)
  })

  it('marks requests as paid with method', () => {
    const provider = createSeedProviders()[0]
    const request = createRequest({
      category: provider.category,
      location: provider.location,
      mode: 'help-now',
      provider,
    })

    const paidRequest = markRequestPaid(request, request.id, 'wallet')

    expect(paidRequest.paymentStatus).toBe('paid')
    expect(paidRequest.paymentMethod).toBe('wallet')
  })

  it('tracks provider earnings from completed requests only', () => {
    const provider = createSeedProviders()[0]
    const created = createRequest({
      category: provider.category,
      location: provider.location,
      mode: 'help-now',
      provider,
    })
    const completed = updateRequestStatus(created, created.id, 'completed')
    const accepted = updateRequestStatus(created, created.id, 'accepted')

    const summary = getProviderSummary(provider, [completed, accepted])

    expect(summary.completedJobs).toBe(1)
    expect(summary.openJobs).toBe(1)
    expect(summary.earnings).toBe(completed.priceEstimate)
  })

  it('supports cancellation eligibility for pending and accepted requests', () => {
    expect(canCancelRequest('pending')).toBe(true)
    expect(canCancelRequest('accepted')).toBe(true)
    expect(canCancelRequest('in-progress')).toBe(false)
    expect(canCancelRequest('completed')).toBe(false)
  })

  it('does not treat cancelled requests as open jobs', () => {
    expect(openRequestStatuses).not.toContain('cancelled')
  })
})
