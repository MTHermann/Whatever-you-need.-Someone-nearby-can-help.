export type ServiceCategory = {
  id: string;
  label: string;
  icon: string;
  description: string;
  startingPrice: number;
};

export type ProviderAvailability = 'available' | 'busy' | 'offline';

export type Provider = {
  id: string;
  name: string;
  title: string;
  rating: number;
  jobsCompleted: number;
  distanceKm: number;
  etaMinutes: number;
  categories: string[];
  availability: ProviderAvailability;
  earnings: number;
  bio: string;
};

export type RequestStatus = 'pending' | 'accepted' | 'enRoute' | 'onsite' | 'completed' | 'declined';
export type ScheduleType = 'now' | 'later';

export type RequestTimelineEvent = {
  label: string;
  timestamp: string;
};

export type ServiceRequest = {
  id: string;
  customerName: string;
  categoryId: string;
  scheduleType: ScheduleType;
  location: string;
  details: string;
  scheduledFor?: string;
  status: RequestStatus;
  priceEstimate: string;
  payoutAmount: number;
  providerId?: string;
  providerName?: string;
  declinedProviderIds: string[];
  createdAt: string;
  timeline: RequestTimelineEvent[];
};
