import { api } from '@/lib/api'

export interface PrivacyPolicy {
  title: string
  version: string
  sections: { title: string; content: string }[]
  last_updated: string
}

export interface ConsentInput {
  consent_data_collection: boolean
  consent_marketing: boolean
  consent_third_party: boolean
}

export const lgpdService = {
  privacyPolicy: () => api.get<PrivacyPolicy>('/api/lgpd/privacy-policy'),
  submitConsent: (consent: ConsentInput) => api.post('/api/lgpd/consent', consent),
  getConsent: () => api.get('/api/lgpd/consent'),
  exportData: () => api.get('/api/lgpd/export'),
  deleteAccount: () => api.delete('/api/lgpd/data'),
}
