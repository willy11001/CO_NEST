const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');
const sequelize = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const mindcafRoutes = require('./routes/mindcafRoutes');
const kycRoutes = require('./routes/kycRoutes');
const chatRoutes = require('./routes/chatRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Swagger Documentation mounting
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/mindcaf', mindcafRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Simple Welcome Route
app.get('/', (req, res) => {
  res.send('Welcome to Co-Nest Cameroonian Real Estate Trust API. Go to /api-docs for documentation.');
});

// Keep track of active users online status
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('Client connected to WebSocket server:', socket.id);

  // Set user online
  socket.on('userOnline', async (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('onlineStatus', { userId, status: 'ONLINE' });
    console.log(`User ${userId} is online.`);
    try {
      const { User } = require('./models');
      await User.update({ lastSeen: new Date() }, { where: { id: userId } });
    } catch (e) {
      console.log('Error updating lastSeen database status:', e.message);
    }
  });

  // Client joining conversation room
  socket.on('joinConversation', (data) => {
    const conversationId = typeof data === 'object' ? data.conversationId : data;
    socket.join(`room_${conversationId}`);
    console.log(`Socket ${socket.id} joined room_${conversationId}`);
  });

  // Client leaving conversation room
  socket.on('leaveConversation', (data) => {
    const conversationId = typeof data === 'object' ? data.conversationId : data;
    socket.leave(`room_${conversationId}`);
    console.log(`Socket ${socket.id} left room_${conversationId}`);
  });

  // Handle message sending
  socket.on('sendMessage', async (data) => {
    console.log('Received sendMessage socket event:', data);
    try {
      const { Message, Conversation, ConversationParticipants } = require('./models');
      
      const msg = await Message.create({
        conversationId: data.conversationId,
        senderId: data.senderId,
        messageType: data.messageType || 'TEXT',
        content: data.content || '',
        imageUrl: data.imageUrl || null,
        isRead: false
      });

      // Update last message timestamp
      await Conversation.update(
        { lastMessageAt: new Date() },
        { where: { id: data.conversationId } }
      );

      // Save/Ensure participant details
      await ConversationParticipants.findOrCreate({
        where: { conversationId: data.conversationId, userId: data.senderId }
      });

      // Broadcast to room
      io.to(`room_${data.conversationId}`).emit('receiveMessage', msg);
    } catch (e) {
      console.error('Error saving real-time message:', e.message);
    }
  });

  // Handle Typing indicator triggers
  socket.on('typing', (data) => {
    socket.to(`room_${data.conversationId}`).emit('typing', {
      conversationId: data.conversationId,
      userId: data.userId
    });
  });

  socket.on('stopTyping', (data) => {
    socket.to(`room_${data.conversationId}`).emit('stopTyping', {
      conversationId: data.conversationId,
      userId: data.userId
    });
  });

  // Handle Mark as Read seen receipts
  socket.on('markAsRead', async (data) => {
    try {
      const { Message, MessageRead } = require('./models');
      const { Op } = require('sequelize');

      // Update messages sent by the other party as read
      await Message.update(
        { isRead: true },
        { 
          where: { 
            conversationId: data.conversationId, 
            senderId: { [Op.ne]: data.userId } 
          } 
        }
      );

      // Log granular MessageRead entries
      const unreadMsgs = await Message.findAll({
        where: { 
          conversationId: data.conversationId, 
          senderId: { [Op.ne]: data.userId } 
        }
      });

      for (const msg of unreadMsgs) {
        await MessageRead.findOrCreate({
          where: { messageId: msg.id, userId: data.userId }
        });
      }

      // Notify other participants in the room
      socket.to(`room_${data.conversationId}`).emit('markAsRead', {
        conversationId: data.conversationId,
        userId: data.userId
      });
    } catch (e) {
      console.error('Error marking messages as read:', e.message);
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected from WebSockets:', socket.id);
    // Find and remove user from online status list
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('onlineStatus', { userId, status: 'OFFLINE' });
        console.log(`User ${userId} went offline.`);
        
        try {
          const { User } = require('./models');
          await User.update({ lastSeen: new Date() }, { where: { id: userId } });
        } catch (e) {
          console.log('Error updating lastSeen offline status:', e.message);
        }
        break;
      }
    }
  });
});

// Sync Database & Start Server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Note: Tables should already be synced and seeded using "npm run db:init".
    // We do not force sync here to preserve data during server restarts.
    await sequelize.sync();
    console.log('Sequelize models synchronized.');

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server is active.`);
      console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Unable to connect to the database or start server. Error:', error.message);
  }
}

startServer();
