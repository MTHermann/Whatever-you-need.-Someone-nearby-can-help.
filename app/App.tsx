import { StatusBar } from 'expo-status-bar';
import { useMemo, useReducer, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { initialProviders, initialRequests, serviceCategories } from './src/mockData';
import { Provider, ProviderAvailability, RequestStatus, ServiceRequest } from './src/types';

type ActiveView = 'customer' | 'provider';

type MarketplaceState = {
  providers: Provider[];
  requests: ServiceRequest[];
};

type CreateRequestPayload = {
  categoryId: string;
  customerName: string;
  scheduleType: 'now' | 'later';
  location: string;
  details: string;
  scheduledFor?: string;
};

type MarketplaceAction =
  | { type: 'create-request'; payload: CreateRequestPayload }
  | { type: 'accept-request'; requestId: string; providerId: string }
  | { type: 'decline-request'; requestId: string; providerId: string }
  | { type: 'advance-request'; requestId: string }
  | { type: 'toggle-provider-availability'; providerId: string };

const initialState: MarketplaceState = {
  providers: initialProviders,
  requests: initialRequests,
};

const statusLabels: Record<RequestStatus, string> = {
  pending: 'Awaiting provider',
  accepted: 'Accepted',
  enRoute: 'On the way',
  onsite: 'On site',
  completed: 'Completed',
  declined: 'No provider available',
};

const statusColors: Record<RequestStatus, { backgroundColor: string; color: string }> = {
  pending: { backgroundColor: '#FEF3C7', color: '#92400E' },
  accepted: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  enRoute: { backgroundColor: '#E0E7FF', color: '#4338CA' },
  onsite: { backgroundColor: '#D1FAE5', color: '#065F46' },
  completed: { backgroundColor: '#DCFCE7', color: '#166534' },
  declined: { backgroundColor: '#FEE2E2', color: '#991B1B' },
};

const availabilityColors: Record<ProviderAvailability, { backgroundColor: string; color: string }> = {
  available: { backgroundColor: '#DCFCE7', color: '#166534' },
  busy: { backgroundColor: '#FDE68A', color: '#92400E' },
  offline: { backgroundColor: '#E5E7EB', color: '#374151' },
};

function formatCurrency(value: number) {
  return `R${value.toLocaleString('en-ZA')}`;
}

function formatDateLabel(value?: string) {
  if (!value) {
    return 'No scheduled time set';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-ZA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function findCategory(categoryId: string) {
  return serviceCategories.find((category) => category.id === categoryId);
}

function addTimelineEvent(request: ServiceRequest, label: string) {
  return {
    ...request,
    timeline: [...request.timeline, { label, timestamp: new Date().toISOString() }],
  };
}

function marketplaceReducer(state: MarketplaceState, action: MarketplaceAction): MarketplaceState {
  switch (action.type) {
    case 'create-request': {
      const category = findCategory(action.payload.categoryId);
      if (!category) {
        return state;
      }

      const request: ServiceRequest = {
        id: `req-${Date.now()}`,
        customerName: action.payload.customerName.trim(),
        categoryId: action.payload.categoryId,
        scheduleType: action.payload.scheduleType,
        location: action.payload.location.trim(),
        details: action.payload.details.trim(),
        scheduledFor: action.payload.scheduledFor?.trim() || undefined,
        status: 'pending',
        priceEstimate: `From ${formatCurrency(category.startingPrice)}`,
        payoutAmount: category.startingPrice,
        declinedProviderIds: [],
        createdAt: new Date().toISOString(),
        timeline: [
          {
            label:
              action.payload.scheduleType === 'now'
                ? 'Help request sent to nearby providers'
                : 'Scheduled booking shared with nearby providers',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      return {
        ...state,
        requests: [request, ...state.requests],
      };
    }
    case 'accept-request': {
      const provider = state.providers.find((item) => item.id === action.providerId);
      if (!provider) {
        return state;
      }

      return {
        providers: state.providers.map((item) =>
          item.id === provider.id ? { ...item, availability: 'busy' } : item,
        ),
        requests: state.requests.map((request) => {
          if (request.id !== action.requestId || request.status !== 'pending') {
            return request;
          }

          const acceptedLabel =
            request.scheduleType === 'now'
              ? `${provider.name} accepted the job and is getting ready to head out`
              : `${provider.name} confirmed the booking`;

          return addTimelineEvent(
            {
              ...request,
              status: 'accepted',
              providerId: provider.id,
              providerName: provider.name,
            },
            acceptedLabel,
          );
        }),
      };
    }
    case 'decline-request': {
      return {
        ...state,
        requests: state.requests.map((request) => {
          if (request.id !== action.requestId || request.status !== 'pending') {
            return request;
          }

          const categoryProviders = state.providers.filter((provider) =>
            provider.categories.includes(request.categoryId),
          );
          const nextDeclinedProviderIds = Array.from(
            new Set([...request.declinedProviderIds, action.providerId]),
          );
          const everyoneDeclined =
            categoryProviders.length > 0 &&
            categoryProviders.every((provider) => nextDeclinedProviderIds.includes(provider.id));

          const updatedRequest = {
            ...request,
            declinedProviderIds: nextDeclinedProviderIds,
            status: everyoneDeclined ? 'declined' : request.status,
          } as ServiceRequest;

          return everyoneDeclined
            ? addTimelineEvent(updatedRequest, 'No matching provider accepted the request')
            : updatedRequest;
        }),
      };
    }
    case 'advance-request': {
      const request = state.requests.find((item) => item.id === action.requestId);
      if (!request || !request.providerId) {
        return state;
      }

      const nextStatusMap: Partial<Record<RequestStatus, RequestStatus>> = {
        accepted: 'enRoute',
        enRoute: 'onsite',
        onsite: 'completed',
      };
      const nextStatus = nextStatusMap[request.status];
      if (!nextStatus) {
        return state;
      }

      return {
        providers: state.providers.map((provider) => {
          if (provider.id !== request.providerId) {
            return provider;
          }

          if (nextStatus === 'completed') {
            return {
              ...provider,
              availability: 'available',
              earnings: provider.earnings + request.payoutAmount,
              jobsCompleted: provider.jobsCompleted + 1,
            };
          }

          return { ...provider, availability: 'busy' };
        }),
        requests: state.requests.map((item) => {
          if (item.id !== request.id) {
            return item;
          }

          const labelByStatus: Record<Exclude<RequestStatus, 'pending' | 'declined'>, string> = {
            accepted: `${item.providerName ?? 'Provider'} confirmed the job`,
            enRoute: `${item.providerName ?? 'Provider'} is on the way`,
            onsite: `${item.providerName ?? 'Provider'} arrived on site`,
            completed: 'Job completed and ready for payout',
          };

          return addTimelineEvent(
            {
              ...item,
              status: nextStatus,
            },
            labelByStatus[nextStatus as Exclude<RequestStatus, 'pending' | 'declined'>],
          );
        }),
      };
    }
    case 'toggle-provider-availability': {
      return {
        ...state,
        providers: state.providers.map((provider) => {
          if (provider.id !== action.providerId || provider.availability === 'busy') {
            return provider;
          }

          return {
            ...provider,
            availability: provider.availability === 'available' ? 'offline' : 'available',
          };
        }),
      };
    }
    default:
      return state;
  }
}

function Pill({ label, palette }: { label: string; palette: { backgroundColor: string; color: string } }) {
  return (
    <View style={[styles.pill, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.pillText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const [state, dispatch] = useReducer(marketplaceReducer, initialState);
  const [activeView, setActiveView] = useState<ActiveView>('customer');
  const [customerName, setCustomerName] = useState('Jordan');
  const [selectedProviderId, setSelectedProviderId] = useState(initialProviders[0].id);
  const [selectedCategoryId, setSelectedCategoryId] = useState(serviceCategories[0].id);
  const [location, setLocation] = useState('Johannesburg CBD');
  const [details, setDetails] = useState('');
  const [scheduledFor, setScheduledFor] = useState('Tomorrow 09:00');

  const isWide = width >= 960;
  const selectedCategory = findCategory(selectedCategoryId);
  const selectedProvider = state.providers.find((provider) => provider.id === selectedProviderId) ?? state.providers[0];
  const nearbyProviders = useMemo(
    () =>
      [...state.providers]
        .filter((provider) => provider.categories.includes(selectedCategoryId))
        .sort((left, right) => {
          const availabilityRank = { available: 0, busy: 1, offline: 2 };
          return availabilityRank[left.availability] - availabilityRank[right.availability] || left.distanceKm - right.distanceKm;
        }),
    [selectedCategoryId, state.providers],
  );

  const customerRequests = useMemo(
    () =>
      state.requests.filter(
        (request) => request.customerName.toLowerCase() === customerName.trim().toLowerCase(),
      ),
    [customerName, state.requests],
  );

  const providerInbox = useMemo(() => {
    if (!selectedProvider) {
      return [];
    }

    return state.requests.filter((request) => {
      const matchesCategory = selectedProvider.categories.includes(request.categoryId);
      const visiblePending =
        request.status === 'pending' && !request.declinedProviderIds.includes(selectedProvider.id);
      const visibleAssigned = request.providerId === selectedProvider.id && request.status !== 'completed';

      return matchesCategory && (visiblePending || visibleAssigned);
    });
  }, [selectedProvider, state.requests]);

  const providerCompletedJobs = useMemo(
    () => state.requests.filter((request) => request.providerId === selectedProvider?.id && request.status === 'completed'),
    [selectedProvider?.id, state.requests],
  );

  const createRequest = (scheduleType: 'now' | 'later') => {
    if (!selectedCategoryId || !location.trim() || !customerName.trim()) {
      return;
    }

    dispatch({
      type: 'create-request',
      payload: {
        categoryId: selectedCategoryId,
        customerName,
        scheduleType,
        location,
        details,
        scheduledFor: scheduleType === 'later' ? scheduledFor : undefined,
      },
    });

    setDetails('');
    if (scheduleType === 'now') {
      setActiveView('customer');
    }
  };

  const nextProviderActionLabel = (request: ServiceRequest) => {
    if (request.status === 'accepted') {
      return request.scheduleType === 'now' ? 'Start travel' : 'Start job';
    }
    if (request.status === 'enRoute') {
      return 'Mark on site';
    }
    if (request.status === 'onsite') {
      return 'Complete job';
    }
    return '';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, isWide && styles.heroWide]}>
          <View style={styles.heroCopy}>
            <Pill label="Mobile + web marketplace" palette={{ backgroundColor: '#E0F2FE', color: '#075985' }} />
            <Text style={styles.heroTitle}>Whatever you need, someone nearby can help.</Text>
            <Text style={styles.heroText}>
              A location-based service marketplace where customers can get urgent help now or book trusted pros for later, while providers manage incoming work, availability, and earnings from one shared product.
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Real-time nearby provider discovery</Text>
              <Text style={styles.featureItem}>• Help Now and Book for Later request flows</Text>
              <Text style={styles.featureItem}>• Provider inbox, status updates, and payout tracking</Text>
              <Text style={styles.featureItem}>• Shared Expo codebase for iOS, Android, and web</Text>
            </View>
          </View>

          <View style={styles.heroPanel}>
            <Text style={styles.heroPanelTitle}>Session scaffolding</Text>
            <Text style={styles.cardSubtitle}>Pick the workspace you want to demo and update the active persona.</Text>
            <View style={styles.segmentedRow}>
              {(['customer', 'provider'] as ActiveView[]).map((view) => (
                <Pressable
                  key={view}
                  onPress={() => setActiveView(view)}
                  style={[styles.segmentButton, activeView === view && styles.segmentButtonActive]}
                >
                  <Text style={[styles.segmentLabel, activeView === view && styles.segmentLabelActive]}>
                    {view === 'customer' ? 'Customer app' : 'Provider app'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Customer name</Text>
              <TextInput value={customerName} onChangeText={setCustomerName} style={styles.input} placeholder="Enter a customer name" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Provider profile</Text>
              <View style={styles.selectionWrap}>
                {state.providers.map((provider) => (
                  <Pressable
                    key={provider.id}
                    onPress={() => setSelectedProviderId(provider.id)}
                    style={[
                      styles.choiceChip,
                      selectedProviderId === provider.id && styles.choiceChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        selectedProviderId === provider.id && styles.choiceChipTextSelected,
                      ]}
                    >
                      {provider.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {activeView === 'customer' ? (
          <View style={[styles.workspace, isWide && styles.workspaceWide]}>
            <View style={styles.primaryColumn}>
              <SectionCard title="Choose a service" subtitle="Select a category, share the location, and request help instantly or schedule it for later.">
                <View style={styles.selectionWrap}>
                  {serviceCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      onPress={() => setSelectedCategoryId(category.id)}
                      style={[
                        styles.categoryCard,
                        selectedCategoryId === category.id && styles.categoryCardSelected,
                      ]}
                    >
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                      <Text style={styles.categoryTitle}>{category.label}</Text>
                      <Text style={styles.categoryDescription}>{category.description}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.formGroupWide}>
                    <Text style={styles.fieldLabel}>Your location</Text>
                    <TextInput value={location} onChangeText={setLocation} style={styles.input} placeholder="Suburb, address, or landmark" />
                  </View>
                  <View style={styles.formGroupWide}>
                    <Text style={styles.fieldLabel}>Preferred time for later bookings</Text>
                    <TextInput value={scheduledFor} onChangeText={setScheduledFor} style={styles.input} placeholder="Tomorrow 09:00" />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Job details</Text>
                  <TextInput
                    value={details}
                    onChangeText={setDetails}
                    style={[styles.input, styles.textArea]}
                    multiline
                    placeholder="Describe the issue, access notes, or what you need done"
                  />
                </View>

                <View style={styles.ctaRow}>
                  <Pressable style={[styles.primaryButton, styles.flexButton]} onPress={() => createRequest('now')}>
                    <Text style={styles.primaryButtonText}>Request Help Now</Text>
                  </Pressable>
                  <Pressable style={[styles.secondaryButton, styles.flexButton]} onPress={() => createRequest('later')}>
                    <Text style={styles.secondaryButtonText}>Book for Later</Text>
                  </Pressable>
                </View>
              </SectionCard>

              <SectionCard title="Request status & tracking" subtitle="Follow every step from request creation through provider arrival and completion.">
                {customerRequests.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Requests created under <Text style={styles.emphasis}>{customerName}</Text> will appear here.
                  </Text>
                ) : (
                  customerRequests.map((request) => {
                    const palette = statusColors[request.status];
                    return (
                      <View key={request.id} style={styles.requestCard}>
                        <View style={styles.requestHeader}>
                          <View>
                            <Text style={styles.requestTitle}>
                              {findCategory(request.categoryId)?.label} · {request.scheduleType === 'now' ? 'Help Now' : 'Book for Later'}
                            </Text>
                            <Text style={styles.requestMeta}>{request.location}</Text>
                          </View>
                          <Pill label={statusLabels[request.status]} palette={palette} />
                        </View>

                        <Text style={styles.requestMeta}>{request.priceEstimate}</Text>
                        <Text style={styles.requestDescription}>{request.details || 'No extra details supplied.'}</Text>
                        {request.providerName ? (
                          <Text style={styles.requestMeta}>Assigned provider: {request.providerName}</Text>
                        ) : null}
                        {request.scheduleType === 'later' ? (
                          <Text style={styles.requestMeta}>Scheduled for: {formatDateLabel(request.scheduledFor)}</Text>
                        ) : null}

                        <View style={styles.timeline}>
                          {request.timeline.slice().reverse().map((event) => (
                            <View key={`${request.id}-${event.timestamp}-${event.label}`} style={styles.timelineItem}>
                              <View style={styles.timelineDot} />
                              <View style={styles.timelineCopy}>
                                <Text style={styles.timelineLabel}>{event.label}</Text>
                                <Text style={styles.timelineTime}>{formatDateLabel(event.timestamp)}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })
                )}
              </SectionCard>
            </View>

            <View style={styles.secondaryColumn}>
              <SectionCard title="Nearby providers" subtitle={selectedCategory ? `Providers matching ${selectedCategory.label} near ${location}.` : undefined}>
                {nearbyProviders.map((provider) => (
                  <View key={provider.id} style={styles.providerCard}>
                    <View style={styles.providerHeader}>
                      <View>
                        <Text style={styles.providerName}>{provider.name}</Text>
                        <Text style={styles.providerTitle}>{provider.title}</Text>
                      </View>
                      <Pill label={provider.availability} palette={availabilityColors[provider.availability]} />
                    </View>
                    <Text style={styles.providerBio}>{provider.bio}</Text>
                    <Text style={styles.providerMeta}>
                      ⭐ {provider.rating} · {provider.jobsCompleted} jobs · {provider.distanceKm} km away · ETA {provider.etaMinutes} min
                    </Text>
                  </View>
                ))}
              </SectionCard>
            </View>
          </View>
        ) : (
          <View style={[styles.workspace, isWide && styles.workspaceWide]}>
            <View style={styles.primaryColumn}>
              <SectionCard
                title="Provider operations"
                subtitle="Accept or decline incoming jobs, then progress accepted work through the live status flow."
              >
                {selectedProvider ? (
                  <View style={styles.providerSummaryCard}>
                    <View style={styles.providerHeader}>
                      <View>
                        <Text style={styles.providerName}>{selectedProvider.name}</Text>
                        <Text style={styles.providerTitle}>{selectedProvider.title}</Text>
                      </View>
                      <Pill label={selectedProvider.availability} palette={availabilityColors[selectedProvider.availability]} />
                    </View>

                    <View style={styles.metricsRow}>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{providerInbox.length}</Text>
                        <Text style={styles.metricLabel}>Visible jobs</Text>
                      </View>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{providerCompletedJobs.length}</Text>
                        <Text style={styles.metricLabel}>Completed</Text>
                      </View>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{formatCurrency(selectedProvider.earnings)}</Text>
                        <Text style={styles.metricLabel}>Earnings</Text>
                      </View>
                    </View>

                    <Pressable
                      style={[styles.secondaryButton, selectedProvider.availability === 'busy' && styles.disabledButton]}
                      disabled={selectedProvider.availability === 'busy'}
                      onPress={() => dispatch({ type: 'toggle-provider-availability', providerId: selectedProvider.id })}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {selectedProvider.availability === 'available' ? 'Go offline' : 'Go available'}
                      </Text>
                    </Pressable>
                    {selectedProvider.availability === 'busy' ? (
                      <Text style={styles.helperText}>Finish the active job to become available again.</Text>
                    ) : null}
                  </View>
                ) : null}

                {providerInbox.length === 0 ? (
                  <Text style={styles.emptyText}>No matching requests are waiting for this provider right now.</Text>
                ) : (
                  providerInbox.map((request) => {
                    const category = findCategory(request.categoryId);
                    const isAssignedToSelected = request.providerId === selectedProvider?.id;
                    return (
                      <View key={request.id} style={styles.requestCard}>
                        <View style={styles.requestHeader}>
                          <View>
                            <Text style={styles.requestTitle}>{category?.label ?? 'Service request'}</Text>
                            <Text style={styles.requestMeta}>{request.customerName} · {request.location}</Text>
                          </View>
                          <Pill label={statusLabels[request.status]} palette={statusColors[request.status]} />
                        </View>

                        <Text style={styles.requestDescription}>{request.details || 'No extra details supplied.'}</Text>
                        <Text style={styles.requestMeta}>{request.priceEstimate}</Text>
                        {request.scheduleType === 'later' ? (
                          <Text style={styles.requestMeta}>Scheduled for: {formatDateLabel(request.scheduledFor)}</Text>
                        ) : null}

                        {request.status === 'pending' ? (
                          <View style={styles.ctaRow}>
                            <Pressable
                              style={[styles.primaryButton, styles.flexButton, selectedProvider?.availability !== 'available' && styles.disabledButton]}
                              disabled={selectedProvider?.availability !== 'available'}
                              onPress={() =>
                                dispatch({
                                  type: 'accept-request',
                                  requestId: request.id,
                                  providerId: selectedProvider!.id,
                                })
                              }
                            >
                              <Text style={styles.primaryButtonText}>Accept job</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.secondaryButton, styles.flexButton]}
                              onPress={() =>
                                dispatch({
                                  type: 'decline-request',
                                  requestId: request.id,
                                  providerId: selectedProvider!.id,
                                })
                              }
                            >
                              <Text style={styles.secondaryButtonText}>Decline</Text>
                            </Pressable>
                          </View>
                        ) : null}

                        {isAssignedToSelected && ['accepted', 'enRoute', 'onsite'].includes(request.status) ? (
                          <Pressable
                            style={styles.primaryButton}
                            onPress={() => dispatch({ type: 'advance-request', requestId: request.id })}
                          >
                            <Text style={styles.primaryButtonText}>{nextProviderActionLabel(request)}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </SectionCard>
            </View>

            <View style={styles.secondaryColumn}>
              <SectionCard title="Availability & coverage" subtitle="The same shared marketplace data powers customer discovery and provider operations.">
                {state.providers.map((provider) => (
                  <View key={provider.id} style={styles.providerCard}>
                    <View style={styles.providerHeader}>
                      <View>
                        <Text style={styles.providerName}>{provider.name}</Text>
                        <Text style={styles.providerTitle}>{provider.title}</Text>
                      </View>
                      <Pill label={provider.availability} palette={availabilityColors[provider.availability]} />
                    </View>
                    <Text style={styles.providerMeta}>{provider.categories.map((categoryId) => findCategory(categoryId)?.label).join(' · ')}</Text>
                    <Text style={styles.providerMeta}>
                      Coverage radius: {provider.distanceKm + 3} km · ETA {provider.etaMinutes} min · Earnings {formatCurrency(provider.earnings)}
                    </Text>
                  </View>
                ))}
              </SectionCard>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  hero: {
    gap: 20,
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroCopy: {
    flex: 1.3,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  heroPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  heroText: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
  },
  heroPanelTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '700',
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
  },
  workspace: {
    gap: 20,
  },
  workspaceWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  primaryColumn: {
    flex: 1.35,
    gap: 20,
  },
  secondaryColumn: {
    flex: 1,
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  cardBody: {
    gap: 16,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#0F172A',
  },
  segmentLabel: {
    color: '#334155',
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: '#FFFFFF',
  },
  formGrid: {
    gap: 12,
  },
  formGroup: {
    gap: 8,
  },
  formGroupWide: {
    gap: 8,
  },
  fieldLabel: {
    color: '#0F172A',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  selectionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  choiceChipSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#60A5FA',
  },
  choiceChipText: {
    color: '#334155',
    fontWeight: '600',
  },
  choiceChipTextSelected: {
    color: '#1D4ED8',
  },
  categoryCard: {
    flexBasis: '48%',
    minWidth: 220,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  categoryCardSelected: {
    borderColor: '#38BDF8',
    backgroundColor: '#F0F9FF',
  },
  categoryIcon: {
    fontSize: 26,
  },
  categoryTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  categoryDescription: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  flexButton: {
    flex: 1,
    minWidth: 170,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0F172A',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  helperText: {
    color: '#64748B',
    fontSize: 13,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  emphasis: {
    fontWeight: '700',
    color: '#0F172A',
  },
  requestCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  requestTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  requestMeta: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  requestDescription: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 22,
  },
  timeline: {
    gap: 10,
    paddingTop: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#0EA5E9',
    marginTop: 6,
  },
  timelineCopy: {
    flex: 1,
    gap: 2,
  },
  timelineLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  timelineTime: {
    color: '#64748B',
    fontSize: 13,
  },
  providerCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  providerSummaryCard: {
    gap: 16,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  providerName: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  providerTitle: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  providerBio: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  providerMeta: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 120,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
