import { useState, useEffect } from 'react';
import { client } from '../lib/amplifyClient';
import type { EbookWithVideos } from '../types';

interface UseChannelEbooksResult {
  ebooks: EbookWithVideos[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch ebooks for a specific channel.
 * Loads ebooks with their related source videos.
 * 
 * @param channelId - The channel identifier to fetch ebooks for
 * @returns Object containing ebooks array, loading state, and error message
 */
export function useChannelEbooks(channelId: string): UseChannelEbooksResult {
  const [ebooks, setEbooks] = useState<EbookWithVideos[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEbooks(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        // Query Ebook model with filter by channelId
        const response = await client.models.Ebook.list({
          filter: { channelId: { eq: channelId } }
        });

        if (response.errors) {
          throw new Error('Failed to fetch ebooks: ' + response.errors.map(e => e.message).join(', '));
        }

        // For each ebook, load related sourceVideos using Promise.all for parallel loading
        const ebooksWithVideos = await Promise.all(
          response.data.map(async (ebook) => {
            const videosResponse = await ebook.sourceVideos();
            return {
              id: ebook.id,
              title: ebook.title,
              pageCount: ebook.pageCount,
              generatedDate: ebook.generatedDate,
              pdfUrl: ebook.pdfUrl,
              channelId: ebook.channelId,
              owner: ebook.owner,
              createdAt: ebook.createdAt,
              updatedAt: ebook.updatedAt,
              sourceVideos: videosResponse.data
            };
          })
        );

        // Set ebooks state with fetched data
        setEbooks(ebooksWithVideos);
      } catch (err) {
        // Handle errors with try-catch, log to console, set user-friendly error message
        console.error('Error fetching ebooks:', err);
        setError('Failed to load ebooks. Please try again.');
      } finally {
        // Set loading to false in finally block
        setLoading(false);
      }
    }

    // Only fetch if channelId exists
    if (channelId) {
      fetchEbooks();
    }
  }, [channelId]);

  return { ebooks, loading, error };
}
