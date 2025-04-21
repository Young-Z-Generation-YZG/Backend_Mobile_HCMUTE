const socketIO = require('socket.io');

class SocketService {
   constructor() {
      this.io = null;
      this.connectedUsers = new Map(); // Map userId -> socketId
      this.connectedAdmins = new Map(); // Map adminId -> socketId
   }

   initialize(server) {
      this.io = socketIO(server, {
         cors: {
            origin: '*',
            methods: ['GET', 'POST'],
         },
      });

      this.io.on('connection', (socket) => {
         console.log(`[LOG:SOCKET]:: New connection: ${socket.id}`);

         socket.on('authenticate', async (message) => {
            const { userId, role } = message;

            if (userId) {
               // Store connection based on role
               if (role === 'ADMIN') {
                  this.connectedAdmins.set(userId, socket.id);
                  console.log(
                     `[LOG:SOCKET]:: Admin ${userId} authenticated with socket ${socket.id}`,
                  );

                  // Join admin room
                  socket.join('admin-notifications');
                  socket.join(`admin:${userId}`);
               } else {
                  this.connectedUsers.set(userId, socket.id);
                  console.log(
                     `[LOG:SOCKET]:: User ${userId} authenticated with socket ${socket.id}`,
                  );
               }

               // Always join user-specific room
               socket.join(`user:${userId}`);
            }
         });

         socket.on('disconnect', () => {
            console.log(`[LOG:SOCKET]:: Socket disconnected: ${socket.id}`);

            // Remove user from connected users
            for (const [userId, socketId] of this.connectedUsers.entries()) {
               if (socketId === socket.id) {
                  this.connectedUsers.delete(userId);
                  console.log(`[LOG:SOCKET]:: User ${userId} disconnected`);
                  break;
               }
            }

            // Remove user from connected admins
            for (const [adminId, socketId] of this.connectedAdmins.entries()) {
               if (socketId === socket.id) {
                  this.connectedAdmins.delete(adminId);
                  console.log(`[LOG:SOCKET]:: Admin ${adminId} disconnected`);
                  break;
               }
            }
         });
      });

      console.log('[LOG:SOCKET]:: Socket.IO initialized');
      return this.io;
   }

   // Send notification to a specific user
   sendNotification(userId, notification) {
      if (this.io) {
         this.io.to(`user:${userId}`).emit('user-notification', notification);
         console.log(`[LOG:SOCKET]:: Notification sent to user ${userId}`);
         return true;
      }
      return false;
   }

   // Send notification to a specific admin
   sendAdminNotification(adminId, notification) {
      if (this.io) {
         this.io
            .to(`admin:${adminId}`)
            .emit('admin-notification', notification);
         console.log(
            `[LOG:SOCKET]:: Admin notification sent to admin ${adminId}`,
         );
         return true;
      }
      return false;
   }

   // Send notification to multiple users
   sendNotificationToMany(userIds, notification) {
      if (this.io) {
         userIds.forEach((userId) => {
            this.io
               .to(`user:${userId}`)
               .emit('user-notification', notification);
         });
         console.log(
            `[LOG:SOCKET]:: Notification sent to users: ${userIds.join(', ')}`,
         );
         return true;
      }
      return false;
   }

   // Send notification to all admins
   broadcastToAdmins(notification) {
      if (this.io) {
         this.io
            .to('admin-notifications')
            .emit('admin-notification', notification);
         console.log('[LOG:SOCKET]:: Notification broadcasted to all admins');
         return true;
      }
      return false;
   }

   // Broadcast notification to all connected users (not admins)
   broadcastToUsers(notification) {
      if (this.io) {
         // Use individual emits to avoid sending to admin connections
         for (const [userId, socketId] of this.connectedUsers.entries()) {
            this.io.to(socketId).emit('user-notification', notification);
         }
         console.log('[LOG:SOCKET]:: Notification broadcasted to all users');
         return true;
      }
      return false;
   }

   // Broadcast notification to everyone
   broadcastNotification(notification) {
      if (this.io) {
         this.io.emit('notification', notification);
         console.log('[LOG:SOCKET]:: Notification broadcasted to everyone');
         return true;
      }
      return false;
   }

   // Check if a user is online
   isUserOnline(userId) {
      return this.connectedUsers.has(userId);
   }

   // Check if an admin is online
   isAdminOnline(adminId) {
      return this.connectedAdmins.has(adminId);
   }

   // Get all online users (non-admins)
   getOnlineUsers() {
      return Array.from(this.connectedUsers.keys());
   }

   // Get all online admins
   getOnlineAdmins() {
      return Array.from(this.connectedAdmins.keys());
   }
}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService;
