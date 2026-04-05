import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { Star } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`size-4 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

export default async function PortalReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clientId: string | undefined = user.user_metadata?.client_id
  if (!clientId) redirect('/portal')

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, content, project_name, is_published, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Share feedback about your experience</p>
        </div>
        <Link href="/portal/reviews/new">
          <Button>+ Write a Review</Button>
        </Link>
      </div>

      {reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map(review => (
            <Card key={review.id}>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {review.project_name && (
                      <CardTitle className="text-sm font-semibold">{review.project_name}</CardTitle>
                    )}
                    <StarRating rating={review.rating} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                    <span className={`text-xs font-medium ${review.is_published ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {review.is_published ? 'Published' : 'Pending review'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              {review.content && (
                <CardContent className="pt-3">
                  <p className="text-sm">{review.content}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="size-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">Share your experience working with us</p>
            <Link href="/portal/reviews/new" className="mt-4 inline-block">
              <Button variant="outline">Write your first review</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
