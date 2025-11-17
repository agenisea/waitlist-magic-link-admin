'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  listInvites,
  createInvite,
  revokeInvite,
  resendInvite,
  type AdminInvite
} from '@/lib/client/admin-api'
import { INVITE_STATUS, type InviteStatus } from '@/lib/admin/constants'
import { formatDate } from '@/lib/utils/date-formatting'

export function InvitesAdmin() {
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [filteredInvites, setFilteredInvites] = useState<AdminInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | InviteStatus>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createFirstName, setCreateFirstName] = useState('')
  const [createLastName, setCreateLastName] = useState('')
  const [createExpiry, setCreateExpiry] = useState('15')
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [resentLink, setResentLink] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  async function loadInvites() {
    setLoading(true)
    setError(null)

    const result = await listInvites()

    if (result.success && result.invites) {
      setInvites(result.invites)
      setFilteredInvites(result.invites)
    } else {
      setError(result.error || 'Failed to load invites')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadInvites()
  }, [])

  useEffect(() => {
    let filtered = invites

    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(i =>
        i.email.toLowerCase().includes(query) ||
        i.slug.toLowerCase().includes(query)
      )
    }

    setFilteredInvites(filtered)
  }, [invites, statusFilter, searchQuery])

  async function handleCreate() {
    if (!createEmail) {
      alert('Email is required')
      return
    }

    setCreating(true)

    const result = await createInvite({
      email: createEmail,
      firstName: createFirstName || undefined,
      lastName: createLastName || undefined,
      expiresInMinutes: parseInt(createExpiry) || 15
    })

    if (result.success && result.invite) {
      await navigator.clipboard.writeText(result.invite.magicLink)
      setCreatedLink(result.invite.magicLink)
      setCreateEmail('')
      setCreateFirstName('')
      setCreateLastName('')
      setCreateExpiry('15')

      // Add new invite to local state without full reload
      const newInviteDisplay: AdminInvite = {
        inviteId: result.invite.inviteId,
        email: createEmail,
        slug: result.invite.slug,
        status: 'active' as const,
        maxUses: result.invite.maxUses,
        currentUses: 0,
        expiresAt: result.invite.expiresAt,
        createdAt: new Date().toISOString(),
        purpose: 'admin_created',
        usedAt: null
      }
      setInvites([newInviteDisplay, ...invites])

      setTimeout(() => {
        setCreatedLink(null)
        setShowCreateForm(false)
      }, 5000)
    } else {
      alert(result.error || 'Failed to create invite')
    }

    setCreating(false)
  }

  async function handleRevoke(inviteId: string) {
    if (!confirm('Are you sure you want to revoke this invite?')) {
      return
    }

    setProcessingId(inviteId)

    const result = await revokeInvite(inviteId)

    if (result.success) {
      // Update local state without full reload
      const updatedInvites = invites.map(inv =>
        inv.inviteId === inviteId
          ? { ...inv, status: 'revoked' as const }
          : inv
      )
      setInvites(updatedInvites)
    } else {
      alert(result.error || 'Failed to revoke invite')
    }

    setProcessingId(null)
  }

  async function handleResend(email: string) {
    setProcessingId(email)

    const result = await resendInvite(email)

    if (result.success && result.invite) {
      await navigator.clipboard.writeText(result.invite.magicLink)
      setResentLink(result.invite.magicLink)
      setCopiedSlug(result.invite.slug)

      // Reload invites to show new one and revoked old ones
      await loadInvites()

      setTimeout(() => {
        setResentLink(null)
        setCopiedSlug(null)
      }, 10000)
    } else {
      alert(result.error || 'Failed to resend invite')
    }

    setProcessingId(null)
  }

  function getStatusBadge(status: AdminInvite['status']) {
    switch (status) {
      case INVITE_STATUS.ACTIVE:
        return <Badge variant="success">Active</Badge>
      case INVITE_STATUS.USED:
        return <Badge variant="default">Used</Badge>
      case INVITE_STATUS.EXPIRED:
        return <Badge variant="warning">Expired</Badge>
      case INVITE_STATUS.REVOKED:
        return <Badge variant="error">Revoked</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground text-sm sm:text-xs landscape:text-xs">
            Loading invites...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-destructive mb-4 text-sm sm:text-xs landscape:text-xs">{error}</p>
            <Button onClick={loadInvites} className="text-sm sm:text-xs landscape:text-xs">Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base sm:text-sm landscape:text-sm">Create Invite</CardTitle>
          <CardDescription className="text-sm sm:text-xs landscape:text-xs">
            Generate a magic link invite for a specific email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showCreateForm ? (
            <Button onClick={() => setShowCreateForm(true)} className="text-sm sm:text-xs landscape:text-xs">
              Create New Invite
            </Button>
          ) : (
            <div className="space-y-4">
              {createdLink && (
                <div className="p-4 rounded-md bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                    Magic link created and copied to clipboard!
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-200 break-all font-mono">
                    {createdLink}
                  </p>
                </div>
              )}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm sm:text-xs landscape:text-xs font-medium">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="First name"
                      value={createFirstName}
                      onChange={(e) => setCreateFirstName(e.target.value)}
                      disabled={creating}
                      className="text-sm sm:text-xs landscape:text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm sm:text-xs landscape:text-xs font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Last name"
                      value={createLastName}
                      onChange={(e) => setCreateLastName(e.target.value)}
                      disabled={creating}
                      className="text-sm sm:text-xs landscape:text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm sm:text-xs landscape:text-xs font-medium">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@company.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    disabled={creating}
                    aria-required="true"
                    className="text-sm sm:text-xs landscape:text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="expiry" className="text-sm sm:text-xs landscape:text-xs font-medium">Expiry (minutes)</Label>
                  <Input
                    id="expiry"
                    name="expiry"
                    type="number"
                    placeholder="15"
                    value={createExpiry}
                    onChange={(e) => setCreateExpiry(e.target.value)}
                    disabled={creating}
                    min="1"
                    max="1440"
                    className="text-sm sm:text-xs landscape:text-xs"
                  />
                  <p className="text-xs sm:text-[10px] landscape:text-[10px] text-muted-foreground mt-1">
                    Default: 15 minutes. Max: 24 hours (1440 minutes)
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating} className="text-sm sm:text-xs landscape:text-xs">
                  {creating ? 'Creating...' : 'Create & Copy Link'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setCreatedLink(null)
                  }}
                  disabled={creating}
                  className="text-sm sm:text-xs landscape:text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base sm:text-sm landscape:text-sm">Invite Management</CardTitle>
          <CardDescription className="text-sm sm:text-xs landscape:text-xs">
            View and manage existing invites
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resentLink && (
            <div className="p-4 rounded-md bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 mb-6">
              <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                New magic link created and copied to clipboard!
              </p>
              <p className="text-xs text-green-800 dark:text-green-200 break-all font-mono">
                {resentLink}
              </p>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              id="invites-search"
              name="invites_search"
              placeholder="Search by email or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:flex-1 text-sm sm:text-xs landscape:text-xs"
            />
            <select
              id="invites-status-filter"
              name="invites_status_filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm sm:text-xs landscape:text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {filteredInvites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm sm:text-xs landscape:text-xs">
              No invites found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm sm:text-xs landscape:text-xs font-normal text-slate-900 dark:text-slate-100">
                    <th className="pb-2 sm:pb-3 pr-4 font-normal">Email</th>
                    <th className="pb-2 sm:pb-3 pr-4 font-normal">Slug</th>
                    <th className="pb-2 sm:pb-3 pr-4 font-normal">Status</th>
                    <th className="pb-2 sm:pb-3 pr-4 font-normal">Usage</th>
                    <th className="pb-2 sm:pb-3 pr-4 font-normal">Expires At</th>
                    <th className="pb-2 sm:pb-3 pr-4 font-normal">Created</th>
                    <th className="pb-2 sm:pb-3 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvites.map((invite) => (
                    <tr key={invite.inviteId} className="border-b last:border-0">
                      <td className="py-2 sm:py-3 pr-4 font-medium text-xs sm:text-[11px] landscape:text-[11px]">
                        {invite.email}
                      </td>
                      <td className="py-2 sm:py-3 pr-4 font-mono text-xs sm:text-[11px] landscape:text-[11px]">
                        {invite.slug}
                      </td>
                      <td className="py-2 sm:py-3 pr-4">
                        {getStatusBadge(invite.status)}
                      </td>
                      <td className="py-2 sm:py-3 pr-4 text-xs sm:text-[11px] landscape:text-[11px]">
                        {invite.currentUses} / {invite.maxUses}
                      </td>
                      <td className="py-2 sm:py-3 pr-4 text-xs sm:text-[11px] landscape:text-[11px] text-muted-foreground">
                        {formatDate(invite.expiresAt)}
                      </td>
                      <td className="py-2 sm:py-3 pr-4 text-xs sm:text-[11px] landscape:text-[11px] text-muted-foreground">
                        {formatDate(invite.createdAt)}
                      </td>
                      <td className="py-2 sm:py-3">
                        <div className="flex gap-1 sm:gap-2">
                          {invite.status !== INVITE_STATUS.REVOKED && (
                            <Button
                              size="sm"
                              onClick={() => handleResend(invite.email)}
                              disabled={processingId === invite.email || processingId === invite.inviteId}
                              className="text-xs sm:text-[10px] landscape:text-[10px] h-8"
                            >
                              {copiedSlug === invite.slug ? 'Copied!' : 'Resend'}
                            </Button>
                          )}
                          {invite.status === INVITE_STATUS.ACTIVE && (
                            <Button
                              size="sm"
                              onClick={() => handleRevoke(invite.inviteId)}
                              disabled={processingId === invite.inviteId}
                              className="text-xs sm:text-[10px] landscape:text-[10px] h-8"
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base sm:text-sm landscape:text-sm">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-sm sm:text-xs landscape:text-xs text-muted-foreground mb-1">Total Invites</div>
              <div className="text-sm sm:text-xs landscape:text-xs font-semibold text-slate-900 dark:text-slate-100">{invites.length}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-sm sm:text-xs landscape:text-xs text-muted-foreground mb-1">Active</div>
              <div className="text-sm sm:text-xs landscape:text-xs font-semibold text-slate-900 dark:text-slate-100">
                {invites.filter(i => i.status === INVITE_STATUS.ACTIVE).length}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-sm sm:text-xs landscape:text-xs text-muted-foreground mb-1">Used</div>
              <div className="text-sm sm:text-xs landscape:text-xs font-semibold text-slate-900 dark:text-slate-100">
                {invites.filter(i => i.status === INVITE_STATUS.USED).length}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-sm sm:text-xs landscape:text-xs text-muted-foreground mb-1">Expired</div>
              <div className="text-sm sm:text-xs landscape:text-xs font-semibold text-slate-900 dark:text-slate-100">
                {invites.filter(i => i.status === INVITE_STATUS.EXPIRED).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
