import type { Schema } from '../../amplify/data/resource';

/**
 * A channel record from the data model.
 * Represents a YouTube channel tracked by the user.
 */
export type Channel = Schema['Channel']['type'];

/**
 * A video record from the data model.
 * Represents a YouTube video with metadata.
 */
export type Video = Schema['Video']['type'];

/**
 * Ebook with its related source videos resolved.
 * Used when displaying ebooks with their associated video content.
 */
export interface EbookWithVideos {
  id: string;
  title: string;
  pageCount: number;
  generatedDate: string;
  pdfUrl: string;
  channelId: string;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
  sourceVideos: Array<{
    id: string;
    title: string;
    url: string;
    ebookId: string;
    owner?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}
