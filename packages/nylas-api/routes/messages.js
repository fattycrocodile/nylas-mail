const Joi = require('joi');
const Serialization = require('../serialization');
const {createSyncbackRequest} = require('../route-helpers');


module.exports = (server) => {
  server.route({
    method: 'GET',
    path: '/messages',
    config: {
      description: 'Returns all your messages.',
      notes: 'Notes go here',
      tags: ['messages'],
      validate: {
        query: {
          limit: Joi.number().integer().min(1).max(2000).default(100),
          offset: Joi.number().integer().min(0).default(0),
        },
      },
      response: {
        schema: Joi.array().items(
          Serialization.jsonSchema('Message')
        ),
      },
    },
    handler: (request, reply) => {
      request.getAccountDatabase().then((db) => {
        const {Message, Folder, Label} = db;
        Message.findAll({
          limit: request.query.limit,
          offset: request.query.offset,
          include: [{model: Folder}, {model: Label}],
        }).then((messages) => {
          reply(Serialization.jsonStringify(messages));
        })
      })
    },
  });

  server.route({
    method: 'GET',
    path: '/messages/{id}',
    config: {
      description: 'Returns message for specified id.',
      notes: 'Notes go here',
      tags: ['messages'],
      validate: {
        params: {
          id: Joi.string(),
        },
      },
      response: {
        schema: Joi.alternatives().try(
          Serialization.jsonSchema('Message'),
          Joi.string()
        ),
      },
    },
    handler: (request, reply) => {
      request.getAccountDatabase().then((db) => {
        const {Message, Folder, Label} = db;
        const {headers: {accept}} = request;
        const {params: {id}} = request;
        const account = request.auth.credentials;

        Message.findOne({where: {id}, include: [{model: Folder}, {model: Label}]}).then((message) => {
          if (!message) {
            return reply.notFound(`Message ${id} not found`)
          }
          if (accept === 'message/rfc822') {
            return message.fetchRaw({account, db, logger: request.logger})
            .then((rawMessage) =>
              reply(rawMessage)
            )
          }
          return reply(Serialization.jsonStringify(message));
        })
        .catch((err) => {
          request.logger.error(err, 'Error fetching message')
          reply(err)
        })
      })
    },
  })

  server.route({
    method: 'PUT',
    path: '/messages/{id}',
    config: {
      description: 'Update a message',
      tags: ['messages'],
      validate: {
        params: {
          id: Joi.string(),
          payload: {
            unread: Joi.boolean(),
            starred: Joi.boolean(),
            labels: Joi.array(),
            label_ids: Joi.array(),
            folder: Joi.string(),
            folder_id: Joi.string(),
          },
        },
      },
      response: {
        schema: Serialization.jsonSchema('SyncbackRequest'),
      },
    },
    handler: (request, reply) => {
      const payload = request.payload
      if (payload.label_ids || payload.labels) {
        const account = request.auth.credentials;
        if (account.supportsLabels()) {
          createSyncbackRequest(request, reply, {
            type: "SetMessageLabels",
            props: {
              labelIds: request.payload.label_ids || payload.labels,
              messageId: request.params.id,
            },
          })
        }
      } else if (payload.folder_id || payload.folder) {
        createSyncbackRequest(request, reply, {
          type: "MoveMessageToFolder",
          props: {
            folderId: request.payload.folder_id || payload.folder,
            messageId: request.params.id,
          },
        })
      } else if (payload.unread === false) {
        createSyncbackRequest(request, reply, {
          type: "MarkMessageAsRead",
          props: {
            messageId: request.params.id,
          },
        })
      } else if (payload.unread === true) {
        createSyncbackRequest(request, reply, {
          type: "MarkMessageAsUnread",
          props: {
            messageId: request.params.id,
          },
        })
      } else if (payload.starred === false) {
        createSyncbackRequest(request, reply, {
          type: "UnstarMessage",
          props: {
            messageId: request.params.id,
          },
        })
      } else if (payload.starred === true) {
        createSyncbackRequest(request, reply, {
          type: "StarMessage",
          props: {
            messageId: request.params.id,
          },
        })
      } else {
        reply("Invalid message update").code(400)
      }
    },
  });
};
