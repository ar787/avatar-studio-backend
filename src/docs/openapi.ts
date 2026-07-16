const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Avatar App API',
    version: '1.0.0',
    description:
      'REST API for avatar generation, editing, and album management.',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/auth': {
      post: {
        tags: ['Auth'],
        summary: 'Initialize user profile',
        description:
          'Creates a Firestore user document on first sign-in. Idempotent — safe to call on every login.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessMessage' },
                example: {
                  success: true,
                  message: 'User profile already exists',
                },
              },
            },
          },
          '201': {
            description: 'New user profile created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessMessage' },
                example: {
                  success: true,
                  message: 'User profile initialized successfully',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get authenticated user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/UserProfile' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update display name',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string', example: 'Jane Doe' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/users/profile/image': {
      patch: {
        tags: ['Users'],
        summary: 'Upload profile picture',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['picture'],
                properties: {
                  picture: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file (max 3 MB, images only)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Picture uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    picture: {
                      type: 'string',
                      example: 'https://storage.googleapis.com/...',
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '413': { $ref: '#/components/responses/FileTooLarge' },
        },
      },
    },

    '/avatars': {
      get: {
        tags: ['Avatars'],
        summary: 'List public avatar catalog',
        description:
          'Returns all avatars in the public catalog. No auth required.',
        responses: {
          '200': {
            description: 'Public avatars',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/GeneratedAvatar' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Avatars'],
        summary: 'Generate a new avatar',
        description:
          'Calls the AI image generation API. Deducts 1 credit. Credit is refunded if generation fails.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: {
                    type: 'string',
                    example: 'cyberpunk warrior with neon lights',
                  },
                  style: { $ref: '#/components/schemas/StyleTemplate' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Avatar generated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        generatedAvatarUrls: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                        remainingCredits: { type: 'integer' },
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/avatars/library': {
      get: {
        tags: ['Avatars'],
        summary: "Get user's generated avatar library",
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User avatar library',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/GeneratedAvatar' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/avatars/library/{filename}/download': {
      get: {
        tags: ['Avatars'],
        summary: "Download an avatar from the user's library",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'filename',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'image-1234567890.png' },
          },
        ],
        responses: {
          '200': {
            description: 'Binary file stream',
            content: { 'application/octet-stream': {} },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/avatars/{filename}/download': {
      get: {
        tags: ['Avatars'],
        summary: 'Download a public avatar',
        parameters: [
          {
            name: 'filename',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'avatar-sample.png' },
          },
        ],
        responses: {
          '200': {
            description: 'Binary file stream',
            content: { 'application/octet-stream': {} },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/avatars/save-edited': {
      post: {
        tags: ['Avatars'],
        summary: 'Save an edited avatar',
        description:
          'Uploads the edited image file and persists it as a new library entry. Deducts 1 credit. Optionally adds the result to an album.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'avatarId'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Edited image file (max 3 MB)',
                  },
                  avatarId: {
                    type: 'string',
                    description: 'ID of the original source avatar',
                  },
                  albumId: {
                    type: 'string',
                    description:
                      'If provided, also adds the result to this album',
                  },
                  preset: {
                    type: 'string',
                    enum: [
                      'grayscale',
                      'sepia',
                      'vintage',
                      'kodachrome',
                      'brownie',
                      'polaroid',
                      'blackwhite',
                      'invert',
                    ],
                  },
                  adjustments: {
                    type: 'string',
                    description: 'JSON-encoded adjustments object',
                    example: '{"brightness":0.8,"contrast":0.2}',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Edited avatar saved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        avatar: {
                          $ref: '#/components/schemas/GeneratedAvatar',
                        },
                        remainingCredits: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '413': { $ref: '#/components/responses/FileTooLarge' },
        },
      },
    },

    '/albums': {
      get: {
        tags: ['Albums'],
        summary: "List user's albums",
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Album list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Album' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Albums'],
        summary: 'Create an album',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Summer Edits' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Album created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Album' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/albums/{albumId}': {
      get: {
        tags: ['Albums'],
        summary: 'Get album with its avatars',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'albumId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Album metadata and avatars',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        albumMetadata: { $ref: '#/components/schemas/Album' },
                        avatars: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/AlbumAvatar' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Albums'],
        summary: 'Update album metadata',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'albumId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  coverImageUrl: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Album updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Album' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Albums'],
        summary: 'Delete an album and all its avatars',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'albumId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Album deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessMessage' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/albums/{albumId}/avatars': {
      post: {
        tags: ['Albums'],
        summary: 'Add an avatar to an album',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'albumId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['avatarId'],
                properties: {
                  avatarId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Avatar added to album',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/AlbumAvatar' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/albums/{albumId}/avatars/{avatarDocId}/download': {
      get: {
        tags: ['Albums'],
        summary: 'Download an avatar from an album',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'albumId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'avatarDocId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Binary file stream',
            content: { 'application/octet-stream': {} },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/albums/{albumId}/avatars/{avatarId}': {
      delete: {
        tags: ['Albums'],
        summary: 'Remove an avatar from an album',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'albumId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'avatarId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Avatar removed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessMessage' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Unauthorized: {
        description: 'Missing or invalid Firebase token',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      FileTooLarge: {
        description: 'File exceeds 3 MB limit',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Firebase ID Token',
        description: 'Firebase ID token obtained from the client SDK.',
      },
    },
    schemas: {
      UserProfile: {
        type: 'object',
        properties: {
          displayName: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john@example.com' },
          picture: {
            type: 'string',
            example: 'https://storage.googleapis.com/...',
          },
          emailVerified: { type: 'boolean' },
          credits: { type: 'integer', example: 5 },
          isPremium: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      GeneratedAvatar: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            example: 'https://storage.googleapis.com/...',
          },
          prompt: { type: 'string', example: 'anime ninja warrior' },
          storagePath: {
            type: 'string',
            example: 'users/uid123/generated-avatars/image-123.png',
          },
          extension: { type: 'string', enum: ['png'] },
          createdAt: { type: 'string', format: 'date-time' },
          adjustments: {
            type: 'object',
            additionalProperties: { type: 'number' },
            example: { brightness: 0.8, contrast: 0.2 },
          },
          preset: { allOf: [{ $ref: '#/components/schemas/PresetType' }] },
        },
      },
      Album: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          name: { type: 'string', example: 'My Favourites' },
          description: { type: 'string' },
          coverImageUrl: { type: 'string' },
          avatarCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AlbumAvatar: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          avatarId: { type: 'string' },
          url: {
            type: 'string',
            example: 'https://storage.googleapis.com/...',
          },
          prompt: { type: 'string' },
          extension: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          adjustments: {
            type: 'object',
            additionalProperties: { type: 'number' },
          },
          preset: { allOf: [{ $ref: '#/components/schemas/PresetType' }] },
        },
      },
      PresetType: {
        type: 'string',
        enum: [
          'grayscale',
          'sepia',
          'vintage',
          'kodachrome',
          'brownie',
          'polaroid',
          'blackwhite',
          'invert',
        ],
      },
      StyleTemplate: {
        type: 'string',
        enum: ['none', 'anime', 'simpsons', 'soviet', 'oilPainting'],
      },
      SuccessMessage: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          status: { type: 'string', example: 'BadRequestError' },
          message: { type: 'string', example: 'prompt is required' },
        },
      },
    },
  },
};

export default spec;
