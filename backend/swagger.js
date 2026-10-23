module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Co-Nest API Documentation',
    version: '1.0.0',
    description: 'REST API services for Co-Nest: Cameroonian Real Estate Trust and Verification Mobile Application. Built using Express.js, Sequelize, and MySQL.',
    contact: {
      name: 'Co-Nest Support Team'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local development server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token. Format: Bearer <token>'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'AGT2000002' },
          name: { type: 'string', example: 'Jean Pierre' },
          email: { type: 'string', format: 'email', example: 'agent@conest.com' },
          role: { type: 'string', enum: ['buyer', 'agent', 'admin'], example: 'agent' },
          kycStatus: { type: 'string', enum: ['unverified', 'pending', 'verified'], example: 'verified' },
          cniNumber: { type: 'string', example: '1122334455' }
        }
      },
      Property: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 2 },
          title: { type: 'string', example: 'Modern Student Studio in Molyko' },
          description: { type: 'string', example: 'Fully tiled studio apartment located 5 minutes from UB junction.' },
          category: { type: 'string', enum: ['Rent', 'Sale'], example: 'Rent' },
          type: { type: 'string', enum: ['Apartment', 'Studio', 'House', 'Land'], example: 'Studio' },
          price: { type: 'number', example: 65000 },
          city: { type: 'string', enum: ['Yaoundé', 'Douala', 'Buea', 'Kribi'], example: 'Buea' },
          location: { type: 'string', example: 'Molyko' },
          landTitleNumber: { type: 'string', example: 'TF 4432/Fako' },
          ownerId: { type: 'string', example: 'AGT2000002' }
        }
      },
      CitiChecklist: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 2 },
          propertyId: { type: 'integer', example: 2 },
          proximityToMainStreet: { type: 'integer', example: 150 },
          waterSource: { type: 'string', enum: ['Camwater', 'Borehole', 'Well'], example: 'Camwater' },
          waterRating: { type: 'number', format: 'float', example: 2.1 },
          eneoBackup: { type: 'boolean', example: false },
          roadType: { type: 'string', enum: ['Tarred', 'Dirt'], example: 'Dirt' },
          rainySeasonPassable: { type: 'boolean', example: false },
          estimatedMotoFare: { type: 'integer', example: 250 },
          securityLevel: { type: 'integer', example: 3 }
        }
      },
      MindcafTitle: {
        type: 'object',
        properties: {
          titleNumber: { type: 'string', example: 'TF 6720/Wouri' },
          ownerName: { type: 'string', example: 'Elie Kamga' },
          registrationDate: { type: 'string', format: 'date', example: '2015-06-12' },
          boundaries: { type: 'string', example: 'North by plot 6721, South by public access road...' },
          landArea: { type: 'number', example: 1200.00 },
          status: { type: 'string', enum: ['Active', 'Disputed'], example: 'Disputed' },
          warningCaveats: { type: 'string', example: 'This title is subject to family inheritance litigation...' }
        }
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', example: 'Elie Kamga' },
                  email: { type: 'string', example: 'buyer@conest.com' },
                  password: { type: 'string', example: 'buyer123' },
                  role: { type: 'string', enum: ['buyer', 'agent'], example: 'buyer' },
                  cniNumber: { type: 'string', example: '1122334455' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Bad request (user already exists)' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'User Login',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'agent@conest.com' },
                  password: { type: 'string', example: 'agent123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated successfully, returns JWT' },
          400: { description: 'Invalid credentials' }
        }
      }
    },
    '/auth/forgot-password': {
      post: {
        summary: 'Forgot Password OTP Simulation',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', example: 'buyer@conest.com' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'OTP generated and printed to server logs' }
        }
      }
    },
    '/auth/profile': {
      put: {
        summary: 'Update user avatar and phone number (Name & Email are locked)',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  phone: { type: 'string', example: '+237699448833' },
                  profileImage: { type: 'string', example: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Profile updated successfully' },
          400: { description: 'Name/Email editing locked security warning' }
        }
      }
    },
    '/properties': {
      get: {
        summary: 'Browse and filter property listings',
        tags: ['Properties'],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['Rent', 'Sale'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['Apartment', 'Studio', 'House', 'Land'] } },
          { name: 'city', in: 'query', schema: { type: 'string', enum: ['Yaoundé', 'Douala', 'Buea', 'Kribi'] } },
          { name: 'minPrice', in: 'query', schema: { type: 'integer' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'integer' } },
          { name: 'roadType', in: 'query', schema: { type: 'string', enum: ['Tarred', 'Dirt'] } },
          { name: 'waterSource', in: 'query', schema: { type: 'string', enum: ['Camwater', 'Borehole', 'Well'] } }
        ],
        responses: {
          200: { description: 'Array of property objects with CITI checklists' }
        }
      },
      post: {
        summary: 'Publish a new property listing (Agent only)',
        tags: ['Properties'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'category', 'type', 'price', 'city', 'location'],
                properties: {
                  title: { type: 'string', example: 'Student Studio in Buea' },
                  description: { type: 'string', example: 'Studio with water & Eneo details' },
                  category: { type: 'string', example: 'Rent' },
                  type: { type: 'string', example: 'Studio' },
                  price: { type: 'number', example: 60000 },
                  city: { type: 'string', example: 'Buea' },
                  location: { type: 'string', example: 'Molyko' },
                  landTitleNumber: { type: 'string', example: 'TF 4432/Fako' },
                  images: { type: 'array', items: { type: 'string' } },
                  waterSource: { type: 'string', example: 'Camwater' },
                  waterRating: { type: 'number', example: 2.5 },
                  roadType: { type: 'string', example: 'Dirt' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Listing published successfully' },
          403: { description: 'Forbidden (KYC incomplete or role not agent)' }
        }
      }
    },
    '/properties/{id}/citi-ratings': {
      post: {
        summary: 'Submit renter community CITI ratings (Rent properties only)',
        tags: ['Properties'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['water', 'electricity', 'road', 'security'],
                properties: {
                  water: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
                  electricity: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                  road: { type: 'integer', minimum: 1, maximum: 5, example: 3 },
                  security: { type: 'integer', minimum: 1, maximum: 5, example: 4 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'CITI community rating registered successfully.' },
          400: { description: 'Only rent listings are rateable.' }
        }
      }
    },
    '/mindcaf/verify': {
      post: {
        summary: 'Query Titre Foncier Land Title Registry',
        tags: ['Land Title Check'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['titleNumber'],
                properties: {
                  titleNumber: { type: 'string', example: 'TF 6720/Wouri' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Registry validation details, warnings, owner details, boundaries' }
        }
      }
    },
    '/kyc/submit': {
      post: {
        summary: 'Submit agent CNI identity verification credentials',
        tags: ['KYC Agent'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cniNumber', 'docFullName'],
                properties: {
                  cniNumber: { type: 'string', example: '1122334455' },
                  docFullName: { type: 'string', example: 'Jean Pierre' },
                  cniFrontImage: { type: 'string' },
                  cniBackImage: { type: 'string' },
                  selfieImage: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'KYC request submitted' },
          400: { description: 'Name alignment validation failed' }
        }
      }
    },
    '/payments/pay': {
      post: {
        summary: 'Simulate Mobile Money transaction push (MTN/Orange)',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'paymentMethod', 'type', 'phoneNumber'],
                properties: {
                  amount: { type: 'number', example: 10000 },
                  paymentMethod: { type: 'string', enum: ['MTN MoMo', 'Orange Money'], example: 'MTN MoMo' },
                  type: { type: 'string', enum: ['Listing Promotion', 'Subscription'], example: 'Listing Promotion' },
                  propertyId: { type: 'integer', example: 1 },
                  phoneNumber: { type: 'string', example: '677123456' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Transaction processed successfully' }
        }
      }
    },
    '/admin/login': {
      post: {
        summary: 'Admin Login',
        tags: ['Admin Dashboard'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@conest.com' },
                  password: { type: 'string', example: 'admin123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated admin successfully, returns JWT token' },
          400: { description: 'Invalid admin credentials' }
        }
      }
    },
    '/admin/analytics': {
      get: {
        summary: 'Get dashboard statistics & analytics overview',
        tags: ['Admin Dashboard'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Total users, properties, revenues, pending KYCs' }
        }
      }
    },
    '/admin/kyc/verify': {
      post: {
        summary: 'Verify (Approve or Reject) agent KYC submissions',
        tags: ['Admin Dashboard'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['requestId', 'status'],
                properties: {
                  requestId: { type: 'integer', example: 1 },
                  status: { type: 'string', enum: ['Approved', 'Rejected'], example: 'Approved' },
                  adminNotes: { type: 'string', example: 'Validated CNI matches profile name.' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'KYC status modified and agent status synchronized' }
        }
      }
    }
  }
};
