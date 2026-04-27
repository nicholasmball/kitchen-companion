'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BugReport } from '@/types/database'

type BugReportWithEmail = BugReport & { profiles: { display_name: string | null } | null; user_email?: string }

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  reviewed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}

export default function AdminBugReportsPage() {
  const [reports, setReports] = useState<BugReportWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const checkAdminAndLoad = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      setIsAdmin(true)

      // Fetch bug reports with user display names
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*, profiles(display_name)')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch user emails via auth admin isn't available client-side,
      // so we'll show display_name or user_id
      setReports(data || [])
    } catch (err) {
      console.error('Failed to load bug reports:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    checkAdminAndLoad()
  }, [checkAdminAndLoad])

  const updateStatus = async (reportId: string, newStatus: string) => {
    setUpdatingId(reportId)
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: newStatus })
        .eq('id', reportId)
      if (error) throw error

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status: newStatus as BugReport['status'] } : r
        )
      )
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredReports = filterStatus === 'all'
    ? reports
    : reports.filter((r) => r.status === filterStatus)

  const statusCounts = {
    all: reports.length,
    new: reports.filter((r) => r.status === 'new').length,
    reviewed: reports.filter((r) => r.status === 'reviewed').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bug Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {statusCounts.new} new, {statusCounts.reviewed} reviewed, {statusCounts.resolved} resolved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({statusCounts.all})</SelectItem>
              <SelectItem value="new">New ({statusCounts.new})</SelectItem>
              <SelectItem value="reviewed">Reviewed ({statusCounts.reviewed})</SelectItem>
              <SelectItem value="resolved">Resolved ({statusCounts.resolved})</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={checkAdminAndLoad}>
            Refresh
          </Button>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {filterStatus === 'all' ? 'No bug reports yet.' : `No ${filterStatus} bug reports.`}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={STATUS_COLORS[report.status]}>
                        {report.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-medium mt-2 text-muted-foreground">
                      {report.profiles?.display_name || report.user_id.slice(0, 8) + '...'}
                    </CardTitle>
                  </div>
                  <Select
                    value={report.status}
                    onValueChange={(value) => updateStatus(report.id, value)}
                    disabled={updatingId === report.id}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap">{report.description}</p>
                {report.page_url && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Page: <span className="font-mono">{report.page_url}</span>
                  </p>
                )}
                {report.user_agent && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      User agent
                    </summary>
                    <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                      {report.user_agent}
                    </p>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
