import { SupabaseClient } from '@supabase/supabase-js'
import { retryWithJitter } from '@/lib/utils/fetch'
import type { DatabaseAdapter } from '@/lib/config'
import type {
  Invite,
  WaitlistEntry,
  User,
  Organization,
  OnboardingType,
  CreateInviteData,
  CreateWaitlistData,
  CreateUserData,
  UpdateUserData,
  CreateOrgData,
  InviteFilters,
  WaitlistFilters
} from '@/lib/types'

export function createSupabaseAdapter(supabase: SupabaseClient<any, any, any>): DatabaseAdapter {
  return {
    invites: {
      async create(data: CreateInviteData): Promise<Invite> {
        const result = await retryWithJitter(
          async () => supabase
            .from('invites')
            .insert({
              email: data.email.toLowerCase(),
              first_name: data.first_name || null,
              last_name: data.last_name || null,
              token_hash: data.token_hash,
              url_slug: data.url_slug,
              expires_at: data.expires_at.toISOString(),
              max_uses: data.max_uses,
              purpose: data.purpose,
              sent_by_user_id: data.sent_by_user_id || null,
              ua_hash: data.ua_hash || null,
              ip_prefix: data.ip_prefix || null
            })
            .select()
            .single(),
          { isRetryable: () => true }
        )

        if (result.error) throw result.error
        return result.data as Invite
      },

      async findBySlug(slug: string): Promise<Invite | null> {
        const result = await retryWithJitter(
          async () => supabase
            .from('invites')
            .select('*')
            .eq('url_slug', slug)
            .single(),
          { isRetryable: () => true }
        )

        if (result.error) return null
        return result.data as Invite
      },

      async atomicConsume(
        slug: string,
        tokenHash: string,
        uaHash: string,
        ipPrefix: string
      ): Promise<Invite | null> {
        const result = await retryWithJitter(
          async () => supabase.schema('funcs').rpc('consume_invite', {
            p_slug: slug,
            p_token_hash: tokenHash,
            p_ua_hash: uaHash,
            p_ip_prefix: ipPrefix
          }),
          { isRetryable: () => true }
        )

        if (result.error || !result.data || result.data.length === 0) return null
        return result.data[0] as Invite
      },

      async revoke(inviteId: string): Promise<void> {
        await retryWithJitter(
          async () => supabase
            .from('invites')
            .update({ revoked: true })
            .eq('invite_id', inviteId),
          { isRetryable: () => true }
        )
      },

      async list(filters?: InviteFilters): Promise<Invite[]> {
        const result = await retryWithJitter(
          async () => {
            let query = supabase.from('invites').select('*')

            if (filters?.status === 'active') {
              query = query
                .eq('revoked', false)
                .gt('expires_at', new Date().toISOString())
                .is('used_at', null)
            } else if (filters?.status === 'used') {
              query = query.not('used_at', 'is', null)
            } else if (filters?.status === 'expired') {
              query = query
                .lte('expires_at', new Date().toISOString())
                .is('used_at', null)
            } else if (filters?.status === 'revoked') {
              query = query.eq('revoked', true)
            }

            if (filters?.email) {
              query = query.ilike('email', filters.email)
            }

            if (filters?.sent_by_user_id) {
              query = query.eq('sent_by_user_id', filters.sent_by_user_id)
            }

            return query.order('created_at', { ascending: false })
          },
          { isRetryable: () => true }
        )

        return (result.data || []) as Invite[]
      }
    },

    waitlist: {
      async create(data: CreateWaitlistData): Promise<WaitlistEntry> {
        const result = await retryWithJitter(
          async () => supabase
            .from('waitlist')
            .insert({
              first_name: data.first_name || null,
              last_name: data.last_name || null,
              email: data.email.toLowerCase(),
              organization_name: data.organization_name || null,
              job_title: data.job_title || null,
              interest_reason: data.interest_reason || null,
              use_case: data.use_case || null,
              feedback_importance: data.feedback_importance || null,
              subscribe_newsletter: data.subscribe_newsletter
            })
            .select()
            .single(),
          { isRetryable: () => true }
        )

        if (result.error) throw result.error
        return result.data as WaitlistEntry
      },

      async findByEmail(email: string): Promise<WaitlistEntry | null> {
        const result = await retryWithJitter(
          async () => supabase
            .from('waitlist')
            .select('*')
            .ilike('email', email)
            .single(),
          { isRetryable: () => true }
        )

        return result.data as WaitlistEntry | null
      },

      async list(filters?: WaitlistFilters): Promise<WaitlistEntry[]> {
        const result = await retryWithJitter(
          async () => {
            let query = supabase.from('waitlist').select('*')

            if (filters?.status) {
              query = query.eq('status', filters.status)
            }

            if (filters?.dateFrom) {
              query = query.gte('created_at', filters.dateFrom.toISOString())
            }

            if (filters?.dateTo) {
              query = query.lte('created_at', filters.dateTo.toISOString())
            }

            return query.order('created_at', { ascending: false })
          },
          { isRetryable: () => true }
        )

        return (result.data || []) as WaitlistEntry[]
      },

      async approve(waitlistId: string, inviteId: string): Promise<void> {
        await retryWithJitter(
          async () => supabase
            .from('waitlist')
            .update({ status: 'approved', invite_id: inviteId, updated_at: new Date().toISOString() })
            .eq('waitlist_id', waitlistId),
          { isRetryable: () => true }
        )
      },

      async reject(waitlistId: string): Promise<void> {
        await retryWithJitter(
          async () => supabase
            .from('waitlist')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('waitlist_id', waitlistId),
          { isRetryable: () => true }
        )
      }
    },

    users: {
      async create(data: CreateUserData): Promise<User> {
        const result = await retryWithJitter(
          async () => supabase
            .from('organizations_users')
            .insert({
              email: data.email.toLowerCase(),
              first_name: data.first_name || null,
              last_name: data.last_name || null,
              display_name: data.display_name || null,
              avatar_url: data.avatar_url || null,
              org_id: data.org_id,
              role_id: data.role_id,
              preferences: data.preferences || {}
            })
            .select()
            .single(),
          { isRetryable: () => true }
        )

        if (result.error) throw result.error
        return result.data as User
      },

      async findByEmail(email: string, orgId: string): Promise<User | null> {
        const result = await retryWithJitter(
          async () => supabase
            .from('organizations_users')
            .select('*')
            .eq('org_id', orgId)
            .ilike('email', email)
            .single(),
          { isRetryable: () => true }
        )

        return result.data as User | null
      },

      async findByEmailGlobal(email: string): Promise<User | null> {
        const result = await retryWithJitter(
          async () => supabase
            .from('organizations_users')
            .select('*')
            .ilike('email', email)
            .single(),
          { isRetryable: () => true }
        )

        return result.data as User | null
      },

      async findById(userId: string): Promise<User | null> {
        const result = await retryWithJitter(
          async () => supabase
            .from('organizations_users')
            .select('*')
            .eq('user_id', userId)
            .single(),
          { isRetryable: () => true }
        )

        return result.data as User | null
      },

      async update(userId: string, data: UpdateUserData): Promise<User> {
        const result = await retryWithJitter(
          async () => supabase
            .from('organizations_users')
            .update({
              display_name: data.display_name,
              avatar_url: data.avatar_url,
              preferences: data.preferences,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single(),
          { isRetryable: () => true }
        )

        if (result.error) throw result.error
        return result.data as User
      }
    },

    organizations: {
      async create(data: CreateOrgData): Promise<Organization> {
        const result = await retryWithJitter(
          async () => supabase
            .from('organizations')
            .insert({
              name: data.name,
              slug: data.slug,
              onboarding_type_id: data.onboarding_type_id || null,
              settings: data.settings || {}
            })
            .select()
            .single(),
          { isRetryable: () => true }
        )

        if (result.error) throw result.error
        return result.data as Organization
      },

      async findBySlug(slug: string): Promise<Organization | null> {
        const result = await retryWithJitter(
          async () => supabase
            .from('organizations')
            .select('*')
            .eq('slug', slug)
            .single(),
          { isRetryable: () => true }
        )

        return result.data as Organization | null
      },

      async findById(orgId: string): Promise<Organization | null> {
        const result = await retryWithJitter(
          async () => supabase
            .from('organizations')
            .select('*')
            .eq('org_id', orgId)
            .single(),
          { isRetryable: () => true }
        )

        return result.data as Organization | null
      }
    },

    onboardingTypes: {
      async findByName(name: string): Promise<OnboardingType | null> {
        const result = await retryWithJitter(
          async () => supabase
            .from('onboarding_types')
            .select('*')
            .eq('name', name)
            .single(),
          { isRetryable: () => true }
        )

        return result.data as OnboardingType | null
      }
    }
  }
}
