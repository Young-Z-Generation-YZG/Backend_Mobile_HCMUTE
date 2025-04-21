/**
 * Client-side script for connecting to WebSocket notifications
 *
 * Usage:
 * 1. Include socket.io client: <script src="/socket.io/socket.io.js"></script>
 * 2. Include this script: <script src="/js/notification-client.js"></script>
 * 3. Initialize the notification client:
 *    const notificationClient = new NotificationClient({isAdmin: true});
 *    notificationClient.connect('user-id-here');
 */

class NotificationClient {
   constructor(options = {}) {
      this.socket = null;
      this.connected = false;
      this.options = {
         notificationContainerId: 'notification-container',
         badgeId: 'notification-badge',
         soundEnabled: true,
         isAdmin: false, // Set to true for admin users
         ...options,
      };
      this.notifications = [];
      this.unreadCount = 0;
   }

   /**
    * Connect to the notification WebSocket server
    * @param {string} userId - The user ID to authenticate with
    */
   connect(userId) {
      if (!userId) {
         console.error(
            'User ID is required to connect to notification service',
         );
         return;
      }

      // Connect to socket server (same as current domain)
      this.socket = io();

      // Connection established
      this.socket.on('connect', () => {
         console.log('Connected to notification service');
         this.connected = true;

         // Authenticate the socket connection with user ID and role
         const userRole = this.options.isAdmin ? 'ADMIN' : 'USER';
         this.socket.emit('authenticate', userId, userRole);

         // Update UI to show connected status
         this._updateConnectionStatus(true);
      });

      // Handle incoming notifications based on role
      if (this.options.isAdmin) {
         // Listen for admin notifications
         this.socket.on('admin-notification', (notification) => {
            console.log('New admin notification received:', notification);
            this._processNotification(notification, 'admin');
         });
      } else {
         // Listen for user notifications
         this.socket.on('user-notification', (notification) => {
            console.log('New user notification received:', notification);
            this._processNotification(notification, 'user');
         });
      }

      // Listen for general notifications (sent to everyone)
      this.socket.on('notification', (notification) => {
         console.log('New general notification received:', notification);
         this._processNotification(notification, 'general');
      });

      // Handle disconnection
      this.socket.on('disconnect', () => {
         console.log('Disconnected from notification service');
         this.connected = false;
         this._updateConnectionStatus(false);
      });

      // Handle errors
      this.socket.on('error', (error) => {
         console.error('Notification service error:', error);
      });

      return this;
   }

   /**
    * Process a received notification
    * @private
    * @param {Object} notification - The notification object
    * @param {string} channel - The channel the notification came from
    */
   _processNotification(notification, channel) {
      // Add notification to the list
      notification.channel = channel; // Add channel information
      this.notifications.unshift(notification);
      this.unreadCount++;

      // Update UI
      this._updateNotificationBadge();
      this._displayNotification(notification);

      // Play sound if enabled
      if (this.options.soundEnabled) {
         this._playNotificationSound();
      }

      // Trigger custom event
      document.dispatchEvent(
         new CustomEvent('notification:received', {
            detail: { notification, channel },
         }),
      );
   }

   /**
    * Disconnect from the notification server
    */
   disconnect() {
      if (this.socket && this.connected) {
         this.socket.disconnect();
         this.connected = false;
      }
   }

   /**
    * Fetch notifications from the server
    * @param {Object} options - Options for fetching notifications
    * @returns {Promise} Promise that resolves with notifications
    */
   async fetchNotifications(options = {}) {
      const { page = 1, limit = 10, isRead = null } = options;

      let url = `/api/v1/notifications?page=${page}&limit=${limit}`;
      if (isRead !== null) {
         url += `&isRead=${isRead}`;
      }

      try {
         const response = await fetch(url, {
            method: 'GET',
            headers: {
               Authorization: `Bearer ${this._getAuthToken()}`,
               'Content-Type': 'application/json',
            },
         });

         if (!response.ok) {
            throw new Error('Failed to fetch notifications');
         }

         const data = await response.json();
         return data;
      } catch (error) {
         console.error('Error fetching notifications:', error);
         throw error;
      }
   }

   /**
    * Mark a notification as read
    * @param {string} notificationId - The ID of the notification to mark as read
    * @returns {Promise} Promise that resolves when notification is marked as read
    */
   async markAsRead(notificationId) {
      try {
         const response = await fetch(
            `/api/v1/notifications/${notificationId}/read`,
            {
               method: 'PATCH',
               headers: {
                  Authorization: `Bearer ${this._getAuthToken()}`,
                  'Content-Type': 'application/json',
               },
            },
         );

         if (!response.ok) {
            throw new Error('Failed to mark notification as read');
         }

         // Update internal state
         this.unreadCount = Math.max(0, this.unreadCount - 1);
         this._updateNotificationBadge();

         return await response.json();
      } catch (error) {
         console.error('Error marking notification as read:', error);
         throw error;
      }
   }

   /**
    * Mark all notifications as read
    * @returns {Promise} Promise that resolves when all notifications are marked as read
    */
   async markAllAsRead() {
      try {
         const response = await fetch('/api/v1/notifications/mark-all-read', {
            method: 'PATCH',
            headers: {
               Authorization: `Bearer ${this._getAuthToken()}`,
               'Content-Type': 'application/json',
            },
         });

         if (!response.ok) {
            throw new Error('Failed to mark all notifications as read');
         }

         // Update internal state
         this.unreadCount = 0;
         this._updateNotificationBadge();

         return await response.json();
      } catch (error) {
         console.error('Error marking all notifications as read:', error);
         throw error;
      }
   }

   /**
    * Delete a notification
    * @param {string} notificationId - The ID of the notification to delete
    * @returns {Promise} Promise that resolves when notification is deleted
    */
   async deleteNotification(notificationId) {
      try {
         const response = await fetch(
            `/api/v1/notifications/${notificationId}`,
            {
               method: 'DELETE',
               headers: {
                  Authorization: `Bearer ${this._getAuthToken()}`,
                  'Content-Type': 'application/json',
               },
            },
         );

         if (!response.ok) {
            throw new Error('Failed to delete notification');
         }

         return await response.json();
      } catch (error) {
         console.error('Error deleting notification:', error);
         throw error;
      }
   }

   /**
    * Get the authentication token from local storage
    * @private
    * @returns {string} The authentication token
    */
   _getAuthToken() {
      // This implementation depends on how your app stores the auth token
      // For example, it might be stored in localStorage
      return localStorage.getItem('authToken') || '';
   }

   /**
    * Update the notification badge count
    * @private
    */
   _updateNotificationBadge() {
      const badge = document.getElementById(this.options.badgeId);
      if (badge) {
         badge.textContent = this.unreadCount;
         badge.style.display = this.unreadCount > 0 ? 'block' : 'none';
      }
   }

   /**
    * Display a notification in the UI
    * @private
    * @param {Object} notification - The notification to display
    */
   _displayNotification(notification) {
      const container = document.getElementById(
         this.options.notificationContainerId,
      );
      if (!container) return;

      const element = document.createElement('div');
      element.className = 'notification-item';
      if (notification.channel === 'admin') {
         element.className += ' admin-notification';
      }
      element.setAttribute('data-id', notification.id);
      element.setAttribute('data-channel', notification.channel || 'general');

      // Format the notification based on its type
      let icon = '';
      switch (notification.type) {
         case 'SYSTEM':
            icon = '<i class="fas fa-cog"></i>';
            break;
         case 'USER':
            icon = '<i class="fas fa-user"></i>';
            break;
         case 'ACTIVITY':
            icon = '<i class="fas fa-bell"></i>';
            break;
         case 'NEW_ORDER':
            icon = '<i class="fas fa-shopping-cart"></i>';
            break;
         default:
            icon = '<i class="fas fa-info-circle"></i>';
      }

      // Format time
      const time = new Date(notification.createdAt).toLocaleTimeString();

      element.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${time}</div>
            </div>
            <div class="notification-actions">
                <button class="mark-read-btn">Mark as read</button>
            </div>
        `;

      // Add event listener to mark as read button
      const markReadBtn = element.querySelector('.mark-read-btn');
      markReadBtn.addEventListener('click', (e) => {
         e.preventDefault();
         this.markAsRead(notification.id);
         element.classList.add('read');
      });

      // Add to container
      container.prepend(element);
   }

   /**
    * Play notification sound
    * @private
    */
   _playNotificationSound() {
      // Create audio element for notification sound
      const audio = new Audio('/sounds/notification.mp3');
      audio
         .play()
         .catch((e) => console.log('Could not play notification sound'));
   }

   /**
    * Update connection status in UI
    * @private
    * @param {boolean} connected - Whether the connection is established
    */
   _updateConnectionStatus(connected) {
      // You can implement this method to update UI based on connection status
      console.log(
         `Notification service connection status: ${
            connected ? 'connected' : 'disconnected'
         }`,
      );
   }
}

// Make available globally
window.NotificationClient = NotificationClient;
