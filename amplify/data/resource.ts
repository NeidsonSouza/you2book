import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Channel: a
    .model({
      url: a.string(),
    }).authorization(allow => [allow.owner()]),

  Video: a
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
      sourceVideos: a.hasMany('Video', 'ebookId'),
    }).authorization(allow => [allow.owner()]),
});

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
