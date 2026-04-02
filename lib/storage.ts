// Storage utilities for managing analyzed videos in localStorage

import { Video, ChatMessage } from './types';

const VIDEOS_KEY = 'yt_insights_videos';

/**
 * Get all analyzed videos from localStorage
 */
export function getStoredVideos(): Video[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(VIDEOS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

/**
 * Save a video to localStorage
 */
export function saveVideo(video: Video): void {
  if (typeof window === 'undefined') return;
  try {
    const videos = getStoredVideos();
    const existingIndex = videos.findIndex((v) => v.id === video.id);
    
    if (existingIndex >= 0) {
      videos[existingIndex] = video;
    } else {
      videos.unshift(video);
    }
    
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Get a single video by ID
 */
export function getVideo(videoId: string): Video | null {
  const videos = getStoredVideos();
  return videos.find((v) => v.id === videoId) || null;
}

/**
 * Delete a video from storage
 */
export function deleteVideo(videoId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const videos = getStoredVideos();
    const filtered = videos.filter((v) => v.id !== videoId);
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting from localStorage:', error);
  }
}

/**
 * Generate a simple ID for a video (can be replaced with UUID later)
 */
export function generateVideoId(): string {
  return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
