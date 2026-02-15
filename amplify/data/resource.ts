import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { fetchChannelVideos } from "../functions/fetch-channel-videos/resource"

const schema = a.schema({
  Channel: a
    .model({
      name: a.string(), // Remove .required() to allow null values
      url: a.string().required(),
      youtubeChannelId: a.string(),
      ebooks: a.hasMany('Ebook', 'channelId'),
      videos: a.hasMany('Video', 'channelId'),
      bookGroups: a.hasMany('BookGroup', 'channelId'),
    }).authorization(allow => [allow.owner()]),

  Video: a
    .model({
      youtubeId: a.string().required(),
      title: a.string().required(),
      description: a.string(),
      duration: a.string(),
      summary: a.string(),
      channelId: a.id().required(),
      channel: a.belongsTo('Channel', 'channelId'),
    })
    .authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('youtubeId').name('byYoutubeId'),
      index('channelId').name('byChannel')
    ]),

  // Keep the existing ebook-related video model with a different name
  EbookVideo: a
    .model({
      title: a.string().required(),
      url: a.string().required(),
      ebookId: a.id().required(),
      ebook: a.belongsTo('Ebook', 'ebookId'),
    }).authorization(allow => [allow.owner()]),

  Ebook: a
    .model({
      title: a.string().required(),
      pageCount: a.integer().required(),
      generatedDate: a.datetime().required(),
      pdfUrl: a.string().required(),
      channelId: a.id().required(),
      channel: a.belongsTo('Channel', 'channelId'),
      sourceVideos: a.hasMany('EbookVideo', 'ebookId'),
    }).authorization(allow => [allow.owner()]),

  BookGroup: a
    .model({
      channelId: a.id().required(),
      channel: a.belongsTo('Channel', 'channelId'),
      title: a.string().required(),
      themeDescription: a.string(),
      videoIds: a.string().array().required(),
      createdAt: a.datetime().required(),
    })
    .authorization(allow => [allow.owner()])
    .secondaryIndexes(index => [
      index('channelId').name('byChannel')
    ]),
    
  VideoMetadata: a.customType({
    youtubeId: a.string().required(),
    title: a.string().required(),
    description: a.string().required(),
    duration: a.string().required(),
  }),

  FetchChannelVideosResponse: a.customType({
    message: a.string().required(),
    timestamp: a.string().required(),
    success: a.boolean().required(),
    videos: a.ref('VideoMetadata').array().required(),
  }),
    
  fetchChannelVideos: a
    .query()
    .arguments({
      channelUrl: a.string().required(),
    })
    .returns(a.ref('FetchChannelVideosResponse'))
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(fetchChannelVideos)),

})

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
