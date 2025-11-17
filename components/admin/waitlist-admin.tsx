'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  listWaitlist,
  approveWaitlist,
  rejectWaitlist,
  resendInvite,
  type WaitlistEntry
} from '@/lib/client/admin-api'
import type { WaitlistStatus } from '@/lib/types'
import { WAITLIST_STATUS } from '@/lib/admin/constants'
import { formatDate } from '@/lib/utils/date-formatting'

export function WaitlistAdmin() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  async function loadEntries() {
    setLoading(true)
    setError(null)

    const result = await listWaitlist()

    if (result.success && result.entries) {
      setEntries(result.entries)
      setFilteredEntries(result.entries)
    } else {
      setError(result.error || 'Failed to load waitlist')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadEntries()
  }, [])

  useEffect(() => {
    let filtered = entries

    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.email.toLowerCase().includes(query) ||
        e.firstName?.toLowerCase().includes(query) ||
        e.lastName?.toLowerCase().includes(query) ||
        e.organizationName?.toLowerCase().includes(query)
      )
    }

    setFilteredEntries(filtered)
  }, [entries, statusFilter, searchQuery])

  async function handleApprove(waitlistId: string) {
    setProcessingId(waitlistId)

    const result = await approveWaitlist(waitlistId)

    if (result.success && result.magicLink) {
      await navigator.clipboard.writeText(result.magicLink)
      setCopiedLink(waitlistId)
      setTimeout(() => setCopiedLink(null), 3000)

      // Update local state without full reload
      const updatedEntries = entries.map(e =>
        e.waitlistId === waitlistId
          ? { ...e, status: 'approved' as const, inviteId: result.inviteId || null }
          : e
      )
      setEntries(updatedEntries)
    } else {
      alert(result.error || 'Failed to approve entry')
    }

    setProcessingId(null)
  }

  async function handleReject(waitlistId: string) {
    if (!confirm('Are you sure you want to reject this waitlist entry?')) {
      return
    }

    setProcessingId(waitlistId)

    const result = await rejectWaitlist(waitlistId)

    if (result.success) {
      // Update local state without full reload
      const updatedEntries = entries.map(e =>
        e.waitlistId === waitlistId
          ? { ...e, status: 'rejected' as const }
          : e
      )
      setEntries(updatedEntries)
    } else {
      alert(result.error || 'Failed to reject entry')
    }

    setProcessingId(null)
  }

  async function handleResend(email: string, waitlistId: string) {
    setProcessingId(waitlistId)

    const result = await resendInvite(email)

    if (result.success && result.invite?.magicLink) {
      await navigator.clipboard.writeText(result.invite.magicLink)
      setCopiedLink(waitlistId)
      setTimeout(() => setCopiedLink(null), 3000)
      // No need to reload for resend
    } else {
      alert(result.error || 'Failed to resend invite')
    }

    setProcessingId(null)
  }

  function getStatusBadge(status: WaitlistStatus) {
    switch (status) {
      case WAITLIST_STATUS.PENDING:
        return <Badge variant="warning">Pending</Badge>
      case WAITLIST_STATUS.APPROVED:
        return <Badge variant="success">Approved</Badge>
      case WAITLIST_STATUS.REJECTED:
        return <Badge variant="error">Rejected</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground text-sm sm:text-xs landscape:text-xs">
            Loading waitlist entries...
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
            <Button onClick={loadEntries} className="text-sm sm:text-xs landscape:text-xs">Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base sm:text-sm landscape:text-sm">Waitlist Management</CardTitle>
          <CardDescription className="text-sm sm:text-xs landscape:text-xs">
            Review and approve waitlist entries. Approved entries will receive a magic link via clipboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              id="waitlist-search"
              name="waitlist_search"
              placeholder="Search by email, name, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:flex-1 text-sm sm:text-xs landscape:text-xs"
            />
            <select
              id="waitlist-status-filter"
              name="waitlist_status_filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WaitlistStatus | 'all')}
              className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm sm:text-xs landscape:text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm sm:text-xs landscape:text-xs">
              No waitlist entries found
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead className="border-b">
                  <tr className="text-left text-sm sm:text-xs landscape:text-xs font-normal text-slate-900 dark:text-slate-100">
                    <th className="pb-2 sm:pb-3 pr-2 sm:pr-4 pl-4 sm:pl-0 font-normal">Contact</th>
                    <th className="pb-2 sm:pb-3 pr-2 sm:pr-4 hidden md:table-cell font-normal">Organization</th>
                    <th className="pb-2 sm:pb-3 pr-2 sm:pr-4 hidden lg:table-cell font-normal">Interest</th>
                    <th className="pb-2 sm:pb-3 pr-2 sm:pr-4 font-normal">Status</th>
                    <th className="pb-2 sm:pb-3 pr-2 sm:pr-4 hidden sm:table-cell font-normal">Created</th>
                    <th className="pb-2 sm:pb-3 pr-4 sm:pr-0 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.waitlistId} className="border-b last:border-0">
                      <td className="py-2 sm:py-3 pr-2 sm:pr-4 pl-4 sm:pl-0">
                        <div className="font-medium text-xs sm:text-[11px] landscape:text-[11px]">{entry.email}</div>
                        {(entry.firstName || entry.lastName) && (
                          <div className="text-[10px] sm:text-[9px] landscape:text-[9px] text-muted-foreground">
                            {entry.firstName} {entry.lastName}
                          </div>
                        )}
                      </td>
                      <td className="py-2 sm:py-3 pr-2 sm:pr-4 text-xs sm:text-[11px] landscape:text-[11px] hidden md:table-cell">
                        <div>{entry.organizationName || '-'}</div>
                        {entry.jobTitle && (
                          <div className="text-muted-foreground text-[10px] sm:text-[9px] landscape:text-[9px]">{entry.jobTitle}</div>
                        )}
                      </td>
                      <td className="py-2 sm:py-3 pr-2 sm:pr-4 text-xs sm:text-[11px] landscape:text-[11px] max-w-xs truncate hidden lg:table-cell">
                        {entry.interestReason || '-'}
                      </td>
                      <td className="py-2 sm:py-3 pr-2 sm:pr-4">
                        {getStatusBadge(entry.status)}
                      </td>
                      <td className="py-2 sm:py-3 pr-2 sm:pr-4 text-xs sm:text-[11px] landscape:text-[11px] text-muted-foreground hidden sm:table-cell">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="py-2 sm:py-3 pr-4 sm:pr-0">
                        <div className="flex gap-1 sm:gap-2">
                          {entry.status === WAITLIST_STATUS.PENDING && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(entry.waitlistId)}
                                disabled={processingId === entry.waitlistId}
                                className="text-xs sm:text-[10px] landscape:text-[10px] h-8"
                              >
                                {copiedLink === entry.waitlistId ? 'Copied!' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReject(entry.waitlistId)}
                                disabled={processingId === entry.waitlistId}
                                className="text-xs sm:text-[10px] landscape:text-[10px] h-8"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {entry.status === WAITLIST_STATUS.APPROVED && entry.inviteId && (
                            <Button
                              size="sm"
                              onClick={() => handleResend(entry.email, entry.waitlistId)}
                              disabled={processingId === entry.waitlistId}
                              className="text-xs sm:text-[10px] landscape:text-[10px] h-8"
                            >
                              {copiedLink === entry.waitlistId ? 'Copied!' : 'Resend'}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-sm sm:text-xs landscape:text-xs text-muted-foreground mb-1">Total Entries</div>
              <div className="text-sm sm:text-xs landscape:text-xs font-semibold text-slate-900 dark:text-slate-100">{entries.length}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-sm sm:text-xs landscape:text-xs text-muted-foreground mb-1">Pending</div>
              <div className="text-sm sm:text-xs landscape:text-xs font-semibold text-slate-900 dark:text-slate-100">
                {entries.filter(e => e.status === WAITLIST_STATUS.PENDING).length}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-sm sm:text-xs landscape:text-xs text-muted-foreground mb-1">Approved</div>
              <div className="text-sm sm:text-xs landscape:text-xs font-semibold text-slate-900 dark:text-slate-100">
                {entries.filter(e => e.status === WAITLIST_STATUS.APPROVED).length}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-sm sm:text-xs landscape:text-xs text-muted-foreground mb-1">Rejected</div>
              <div className="text-sm sm:text-xs landscape:text-xs font-semibold text-slate-900 dark:text-slate-100">
                {entries.filter(e => e.status === WAITLIST_STATUS.REJECTED).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
