export const serviceCategories = [
  'plumbers',
  'electricians',
  'cleaning',
  'gardening',
  'household/care services',
  'roadside assistance',
  'jump starts',
  'batteries',
  'tyre changes',
  'towing',
  'locksmith services',
] as const

export type ServiceCategory = (typeof serviceCategories)[number]
export type ServiceRequestMode = 'help-now' | 'book-later'
export type ServiceRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
export type ProviderAvailability = 'available' | 'busy' | 'offline'
export type PaymentStatus = 'unpaid' | 'paid'
export type PaymentMethod = 'card' | 'cash' | 'wallet'

export interface Provider {
  id: string
  name: string
  category: ServiceCategory
  location: string
  phone: string
  rating: number
  etaMinutes: number
  distanceKm: number
  hourlyRate: number
  availability: ProviderAvailability
  completedJobs: number
}

export interface ServiceRequest {
  id: string
  category: ServiceCategory
  location: string
  mode: ServiceRequestMode
  providerId: string
  providerName: string
  status: ServiceRequestStatus
  scheduledFor?: string
  priceEstimate: number
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod
  createdAt: string
}

export interface ProviderSearchOptions {
  availability?: ProviderAvailability | 'any'
  minRating?: number
  maxDistanceKm?: number
  sortBy?: 'eta' | 'nearest' | 'rating'
}

export const areas = [
  'City Centre',
  'Northside',
  'Eastside',
  'Southside',
  'Westside',
] as const

export const storageKey = {
  providers: 'wyn.providers',
  requests: 'wyn.requests',
  profile: 'wyn.profile',
  notifications: 'wyn.notifications',
}

export const defaultBookingSlot = '2026-09-12T10:00'

export const bookingTimeSlots = [
  '08:00',
  '10:00',
  '12:00',
  '14:00',
  '16:00',
  '18:00',
] as const

const seedProviderData: Array<
  Omit<Provider, 'id'> & { category: ServiceCategory }
> = [
  {
    name: 'Rapid Pipe Rescue',
    category: 'plumbers',
    location: 'City Centre',
    phone: '+27 82 111 0001',
    rating: 4.9,
    etaMinutes: 18,
    distanceKm: 1.2,
    hourlyRate: 450,
    availability: 'available',
    completedJobs: 128,
  },
  {
    name: 'Bright Spark Electrical',
    category: 'electricians',
    location: 'Northside',
    phone: '+27 82 111 0002',
    rating: 4.8,
    etaMinutes: 22,
    distanceKm: 4.8,
    hourlyRate: 520,
    availability: 'available',
    completedJobs: 96,
  },
  {
    name: 'Fresh Start Cleaning',
    category: 'cleaning',
    location: 'Eastside',
    phone: '+27 82 111 0003',
    rating: 4.7,
    etaMinutes: 35,
    distanceKm: 6.7,
    hourlyRate: 310,
    availability: 'busy',
    completedJobs: 204,
  },
  {
    name: 'Green Thumb Crew',
    category: 'gardening',
    location: 'Westside',
    phone: '+27 82 111 0004',
    rating: 4.6,
    etaMinutes: 40,
    distanceKm: 7.5,
    hourlyRate: 290,
    availability: 'available',
    completedJobs: 82,
  },
  {
    name: 'Gentle Home Support',
    category: 'household/care services',
    location: 'Southside',
    phone: '+27 82 111 0005',
    rating: 4.9,
    etaMinutes: 28,
    distanceKm: 3.4,
    hourlyRate: 360,
    availability: 'available',
    completedJobs: 117,
  },
  {
    name: 'Road Guard Assist',
    category: 'roadside assistance',
    location: 'City Centre',
    phone: '+27 82 111 0006',
    rating: 4.8,
    etaMinutes: 14,
    distanceKm: 0.9,
    hourlyRate: 550,
    availability: 'available',
    completedJobs: 144,
  },
  {
    name: 'Ignite Jump Starts',
    category: 'jump starts',
    location: 'Northside',
    phone: '+27 82 111 0007',
    rating: 4.7,
    etaMinutes: 16,
    distanceKm: 2.3,
    hourlyRate: 300,
    availability: 'available',
    completedJobs: 61,
  },
  {
    name: 'Battery Mobile Fit',
    category: 'batteries',
    location: 'Eastside',
    phone: '+27 82 111 0008',
    rating: 4.8,
    etaMinutes: 20,
    distanceKm: 2.8,
    hourlyRate: 480,
    availability: 'busy',
    completedJobs: 89,
  },
  {
    name: 'Tyre Change Express',
    category: 'tyre changes',
    location: 'Southside',
    phone: '+27 82 111 0009',
    rating: 4.9,
    etaMinutes: 19,
    distanceKm: 2.1,
    hourlyRate: 420,
    availability: 'available',
    completedJobs: 152,
  },
  {
    name: 'TowLink Recovery',
    category: 'towing',
    location: 'Westside',
    phone: '+27 82 111 0010',
    rating: 4.8,
    etaMinutes: 25,
    distanceKm: 5.4,
    hourlyRate: 680,
    availability: 'available',
    completedJobs: 173,
  },
  {
    name: 'KeyFast Locksmiths',
    category: 'locksmith services',
    location: 'City Centre',
    phone: '+27 82 111 0011',
    rating: 4.9,
    etaMinutes: 17,
    distanceKm: 1.6,
    hourlyRate: 490,
    availability: 'available',
    completedJobs: 201,
  },
]

export const createSeedProviders = () =>
  seedProviderData.map((provider, index) => ({
    ...provider,
    id: `seed-provider-${index + 1}`,
  }))

export const findNearbyProviders = (
  providers: Provider[],
  category: ServiceCategory,
  location: string,
  options: ProviderSearchOptions = {},
) => {
  const { availability = 'any', minRating = 0, maxDistanceKm, sortBy = 'eta' } =
    options

  return providers
    .filter((provider) => provider.category === category)
    .filter((provider) =>
      availability === 'any' ? true : provider.availability === availability,
    )
    .filter((provider) => provider.rating >= minRating)
    .filter((provider) =>
      typeof maxDistanceKm === 'number'
        ? provider.distanceKm <= maxDistanceKm
        : true,
    )
    .sort((left, right) => {
      if (sortBy === 'nearest') {
        return left.distanceKm - right.distanceKm
      }

      if (sortBy === 'rating') {
        return right.rating - left.rating
      }

      const leftLocationBoost = left.location === location ? -10 : 0
      const rightLocationBoost = right.location === location ? -10 : 0
      return (
        left.etaMinutes + leftLocationBoost - (right.etaMinutes + rightLocationBoost)
      )
    })
}

const basePricing: Record<ServiceCategory, number> = {
  plumbers: 450,
  electricians: 520,
  cleaning: 300,
  gardening: 280,
  'household/care services': 340,
  'roadside assistance': 560,
  'jump starts': 260,
  batteries: 480,
  'tyre changes': 400,
  towing: 700,
  'locksmith services': 490,
}

export const createRequest = ({
  category,
  location,
  mode,
  provider,
  scheduledFor,
}: {
  category: ServiceCategory
  location: string
  mode: ServiceRequestMode
  provider: Provider
  scheduledFor?: string
}): ServiceRequest => ({
  id: `request-${provider.id}-${Date.now()}`,
  category,
  location,
  mode,
  providerId: provider.id,
  providerName: provider.name,
  status: 'pending',
  scheduledFor,
  priceEstimate: basePricing[category],
  paymentStatus: 'unpaid',
  createdAt: new Date().toISOString(),
})

export const updateRequestStatus = (
  request: ServiceRequest,
  requestId: string,
  status: ServiceRequestStatus,
) => (request.id === requestId ? { ...request, status } : request)

export const openRequestStatuses: ServiceRequestStatus[] = [
  'pending',
  'accepted',
  'in-progress',
]

export const canCancelRequest = (status: ServiceRequestStatus) =>
  status === 'pending' || status === 'accepted'

export const markRequestPaid = (
  request: ServiceRequest,
  requestId: string,
  paymentMethod: PaymentMethod,
): ServiceRequest =>
  request.id === requestId
    ? {
        ...request,
        paymentStatus: 'paid',
        paymentMethod,
      }
    : request

export const getProviderSummary = (
  provider: Provider | undefined,
  requests: ServiceRequest[],
) => {
  const completedJobs = requests.filter(
    (request) => request.status === 'completed',
  ).length
  const openJobs = requests.filter(
    (request) => openRequestStatuses.includes(request.status),
  ).length
  const earnings = requests
    .filter((request) => request.status === 'completed')
    .reduce((total, request) => total + request.priceEstimate, 0)

  return {
    availability: provider?.availability ?? 'offline',
    completedJobs,
    openJobs,
    earnings,
  }
}
