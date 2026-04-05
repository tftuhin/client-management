'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

export default function NewReviewPage() {
  const router = useRouter()
  const supabase = createClient()

  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [content, setContent] = useState('')
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { toast.error('Please select a rating'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not signed in'); setLoading(false); return }

    const clientId: string | undefined = user.user_metadata?.client_id
    if (!clientId) { toast.error('Account not linked to a client'); setLoading(false); return }

    const { error } = await supabase.from('reviews').insert({
      client_id: clientId,
      author_id: user.id,
      rating,
      content: content.trim() || null,
      project_name: projectName.trim() || null,
      is_published: false,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Review submitted — thank you!')
      router.push('/portal/reviews')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Write a Review</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Share your experience working with us</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-semibold">Your Feedback</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Star rating */}
            <div className="flex flex-col gap-1.5">
              <Label>Rating *</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(n)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`size-8 transition-colors ${
                        n <= (hovered || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-xs text-muted-foreground">
                  {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
                </p>
              )}
            </div>

            {/* Project name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project_name">Project name (optional)</Label>
              <Input
                id="project_name"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. Company Website Redesign"
              />
            </div>

            {/* Review content */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="content">Your review (optional)</Label>
              <Textarea
                id="content"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Tell us about your experience…"
                rows={4}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading || rating === 0}>
                {loading ? 'Submitting…' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
