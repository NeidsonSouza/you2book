import type { Schema } from "../../data/resource"

export const handler: Schema["sayHello"]["functionHandler"] = async (event) => {
  const { name } = event.arguments
  
  // Return fake YouTube videos for testing
  const fakeVideos = [
    {
      youtubeId: "dQw4w9WgXcQ",
      title: "Sample Video 1 - Introduction",
      description: "This is a sample video description for testing purposes",
      duration: "PT3M42S"
    },
    {
      youtubeId: "jNQXAC9IVRw",
      title: "Sample Video 2 - Tutorial",
      description: "Another sample video with a longer description to test the display",
      duration: "PT10M15S"
    },
    {
      youtubeId: "9bZkp7q19f0",
      title: "Sample Video 3 - Advanced Topics",
      description: "Final sample video for the channel",
      duration: "PT5M30S"
    }
  ];
  
  return {
    message: `Fetched videos for channel: ${name}`,
    timestamp: new Date().toISOString(),
    success: true,
    videos: fakeVideos
  }
}
