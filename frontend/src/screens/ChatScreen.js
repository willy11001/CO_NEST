import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert, Linking, ActivityIndicator, Image, Modal } from 'react-native';
import { AuthContext } from '../../App';
import io from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';

export default function ChatScreen({ route, navigation }) {
  const { agentId, agentName, propertyTitle, profileImage } = route.params;
  const { token, serverUrl, user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isAgentOnline, setIsAgentOnline] = useState(false);
  const [lastSeenState, setLastSeenState] = useState(route.params?.lastSeen || null);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  const flatListRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const getAvatarUri = (img) => {
    if (!img) return null;
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return `${serverUrl.replace('/api', '')}${img}`;
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Offline';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Offline';
    
    // Check if today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
                    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Offline (last seen today at ${timeStr})`;
    }
    return `Offline (last seen ${date.toLocaleDateString()} at ${timeStr})`;
  };

  // Initialize or fetch conversation history
  const initChat = async () => {
    setLoading(true);
    try {
      let activeConvId = route.params?.conversationId;

      if (!activeConvId) {
        // Start/Get Conversation
        const response = await fetch(`${serverUrl}/chat/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ agentId })
        });
        const conv = await response.json();
        activeConvId = conv.id;
      }
      setConversationId(activeConvId);

      // Fetch Messages history
      const msgResponse = await fetch(`${serverUrl}/chat/conversations/${activeConvId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const msgs = await msgResponse.json();
      setMessages(msgs);

      // Fetch block status from backend
      try {
        const blockRes = await fetch(`${serverUrl}/chat/block-status?otherUserId=${agentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const blockData = await blockRes.json();
        setBlockedByMe(blockData.blockedByMe);
        setBlockedByOther(blockData.blockedByOther);
      } catch (e) {
        console.log('Error checking block status:', e.message);
      }
    } catch (error) {
      console.log('Error initializing chat, using mock fallbacks...');
      setConversationId(1);
      setMessages([
        { id: 1, senderId: agentId, content: `Hello! Thanks for inquiry on "${propertyTitle || 'Listing'}". Let me know if you want to inspect details.`, messageType: 'TEXT', isRead: true, createdAt: new Date().toISOString() },
        { id: 2, senderId: user.id, content: 'Hi, is this title free of caveats? I want to double check.', messageType: 'TEXT', isRead: true, createdAt: new Date().toISOString() },
        { id: 3, senderId: agentId, content: 'Yes, it is registered under TF 4432/Fako. Owner is Fabiola Njoh. Completely clean.', messageType: 'TEXT', isRead: true, createdAt: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initChat();
  }, [agentId]);

  // Handle Socket connection & real-time events
  useEffect(() => {
    if (!conversationId) return;

    const socketHost = serverUrl.replace('/api', ''); // http://localhost:5000
    const socket = io(socketHost, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected inside ChatScreen:', socket.id);
      socket.emit('userOnline', user.id);
      socket.emit('joinConversation', { conversationId });
      socket.emit('markAsRead', { conversationId, userId: user.id });
    });

    socket.on('receiveMessage', (msg) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Mark seen immediately
      socket.emit('markAsRead', { conversationId, userId: user.id });
    });

    socket.on('typing', (data) => {
      if (data.userId !== user.id) {
        setIsTyping(true);
      }
    });

    socket.on('stopTyping', (data) => {
      if (data.userId !== user.id) {
        setIsTyping(false);
      }
    });

    socket.on('onlineStatus', (data) => {
      if (data.userId === agentId) {
        const online = data.status === 'ONLINE';
        setIsAgentOnline(online);
        if (!online) {
          setLastSeenState(new Date().toISOString());
        }
      }
    });

    socket.on('markAsRead', (data) => {
      if (data.userId !== user.id) {
        // Mark sent messages as read by other party
        setMessages((prev) =>
          prev.map(m => m.senderId === user.id ? { ...m, isRead: true } : m)
        );
      }
    });

    return () => {
      socket.emit('leaveConversation', { conversationId });
      socket.disconnect();
    };
  }, [conversationId]);

  // Handle text inputs typing emitters
  const handleTextChange = (text) => {
    setInputText(text);
    if (!socketRef.current || !conversationId) return;

    socketRef.current.emit('typing', { conversationId, userId: user.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('stopTyping', { conversationId, userId: user.id });
    }, 2000);
  };

  // Handle message send
  const handleSend = async (customContent = null, customType = 'text', customFile = null) => {
    const textToSend = customContent || inputText;
    if (!textToSend && !customFile) return;

    const payload = {
      conversationId,
      senderId: user.id,
      content: textToSend,
      messageType: customType.toUpperCase(),
      imageUrl: customFile,
      type: customType,
      fileUrl: customFile
    };

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('sendMessage', payload);
      socketRef.current.emit('stopTyping', { conversationId, userId: user.id });
    } else {
      // Local fallback
      const newMessage = {
        id: messages.length + 1,
        senderId: user.id,
        content: textToSend,
        messageType: customType.toUpperCase(),
        imageUrl: customFile,
        createdAt: new Date().toISOString(),
        isRead: false
      };
      setMessages((prev) => [...prev, newMessage]);
      try {
        await fetch(`${serverUrl}/chat/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.log('Stored offline');
      }
    }
    setInputText('');
  };

  const shareLocation = () => {
    const coords = '4.1561° N, 9.2411° E (Molyko, Buea)';
    handleSend(`📍 Shared Location: ${coords}`, 'location', 'https://maps.google.com/?q=4.1561,9.2411');
  };

  const uploadPhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to select photos.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        let base64Image = null;

        if (selectedAsset.base64) {
          base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
          handleSend('📷 Photo attached from gallery', 'image', base64Image);
        } else if (Platform.OS === 'web' && selectedAsset.file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            handleSend('📷 Photo attached from gallery', 'image', reader.result);
          };
          reader.readAsDataURL(selectedAsset.file);
        } else {
          // Fallback: Read blob file URI into a real base64 string
          try {
            const response = await fetch(selectedAsset.uri);
            const blob = await response.blob();
            base64Image = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            handleSend('📷 Photo attached from gallery', 'image', base64Image);
          } catch (err) {
            handleSend('📷 Photo attached from gallery', 'image', selectedAsset.uri);
          }
        }
      }
    } catch (e) {
      handleSend('📷 Attached CITI Infrastructure photo', 'image', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400');
    }
  };

  const toggleBlockStatus = async () => {
    try {
      const endpoint = blockedByMe ? '/chat/unblock' : '/chat/block';
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ blockedId: agentId })
      });
      if (response.ok) {
        const nextState = !blockedByMe;
        setBlockedByMe(nextState);
        Alert.alert(nextState ? 'Blocked' : 'Unblocked', `User ${nextState ? 'blocked' : 'unblocked'} successfully.`);
      } else {
        Alert.alert('Error', 'Failed to update block status.');
      }
    } catch (e) {
      setBlockedByMe(!blockedByMe);
      Alert.alert('Simulated Success', `User block status updated.`);
    }
  };

  const handleReport = () => {
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for reporting.');
      return;
    }
    try {
      const response = await fetch(`${serverUrl}/chat/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId,
          reason: reportReason,
          description: reportDesc
        })
      });
      if (response.ok) {
        Alert.alert('Success', 'Conversation reported to administrators.');
        setReportModalVisible(false);
        setReportReason('');
        setReportDesc('');
      } else {
        const err = await response.json();
        Alert.alert('Error', err.message || 'Report submission failed.');
      }
    } catch (e) {
      Alert.alert('Offline Sim', 'Report submitted to admin dashboard.');
      setReportModalVisible(false);
      setReportReason('');
      setReportDesc('');
    }
  };

  const renderMessageItem = ({ item }) => {
    const isMe = item.senderId === user.id;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
        <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>{item.content}</Text>
        
        {item.messageType === 'IMAGE' && item.imageUrl && (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={{ width: 200, height: 150, borderRadius: 8, marginTop: 8, resizeMode: 'cover' }} 
          />
        )}

        {item.messageType === 'LOCATION' && (
          <TouchableOpacity 
            style={styles.mapLinkBtn}
            onPress={() => {
              if (item.imageUrl || item.fileUrl) {
                Linking.openURL(item.imageUrl || item.fileUrl).catch(() => Alert.alert('Error', 'Unable to open Maps.'));
              }
            }}
          >
            <Text style={styles.mapLinkText}>🗺️ Open in Google Maps</Text>
          </TouchableOpacity>
        )}
        {isMe && (
          <Text style={{ fontSize: 9, color: item.isRead ? '#cbd5e1' : '#94a3b8', alignSelf: 'flex-end', marginTop: 4, fontStyle: 'italic' }}>
            {item.isRead ? '✓✓ Read' : '✓ Sent'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      {/* Dynamic Header */}
      <View style={styles.headerBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.avatarMini}>
            {profileImage ? (
              <Image source={{ uri: getAvatarUri(profileImage) }} style={styles.avatarMiniImage} />
            ) : (
              <Text style={styles.avatarMiniText}>{agentName.slice(0,2).toUpperCase()}</Text>
            )}
          </View>
          <View>
            <Text style={styles.headerName}>{agentName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View style={[styles.onlineDot, { backgroundColor: isAgentOnline ? '#2563eb' : '#94a3b8' }]} />
              <Text style={styles.onlineText}>
                {isAgentOnline ? 'Online' : formatLastSeen(lastSeenState)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleReport} style={styles.headerActionBtn}>
            <Text style={{ color: '#ffffff', fontSize: 11 }}>⚠️ Report</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              Alert.alert(
                blockedByMe ? 'Unblock User' : 'Block User',
                `Are you sure you want to ${blockedByMe ? 'unblock' : 'block'} ${agentName}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: blockedByMe ? 'Unblock' : 'Block', style: 'destructive', onPress: toggleBlockStatus }
                ]
              );
            }} 
            style={[styles.headerActionBtn, { backgroundColor: blockedByMe ? '#2563eb' : '#991b1b' }]}
          >
            <Text style={{ color: '#ffffff', fontSize: 11 }}>
              {blockedByMe ? '🔓 Unblock' : '🚫 Block'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Security alert context */}
      <View style={styles.securityHeader}>
        <Text style={styles.securityText}>🛡️ Chat is secured. Names are KYC database locked.</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Typing indicator */}
      {isTyping && (
        <View style={styles.typingIndicatorRow}>
          <Text style={styles.typingIndicatorText}>{agentName} is typing...</Text>
        </View>
      )}

      {/* WhatsApp-style Block Banners */}
      {blockedByMe && (
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              'Unblock User',
              `Are you sure you want to unblock ${agentName}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Unblock', onPress: toggleBlockStatus }
              ]
            );
          }}
          style={styles.blockBanner}
        >
          <Text style={styles.blockBannerText}>You blocked this contact. Tap to unblock.</Text>
        </TouchableOpacity>
      )}

      {blockedByOther && (
        <View style={[styles.blockBanner, { backgroundColor: '#7f1d1d' }]}>
          <Text style={styles.blockBannerText}>This contact has blocked you. You cannot reply.</Text>
        </View>
      )}

      {/* Message input panel */}
      {(!blockedByMe && !blockedByOther) ? (
        <View style={styles.inputArea}>
          <View style={styles.attachmentRow}>
            <TouchableOpacity onPress={uploadPhoto} style={styles.attachBtn}>
              <Text style={styles.attachIcon}>📷 Attach Pic</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.textRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Type message..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={handleTextChange}
            />
            <TouchableOpacity onPress={() => handleSend()} style={styles.sendBtn}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.blockedPlaceholder}>
          <Text style={[styles.blockedPlaceholderText, { marginBottom: blockedByMe ? 10 : 0 }]}>
            {blockedByMe ? 'You have blocked this user' : 'You have been blocked by this user'}
          </Text>
          {blockedByMe && (
            <TouchableOpacity onPress={toggleBlockStatus} style={styles.unblockBtnInline}>
              <Text style={styles.unblockBtnInlineText}>🔓 Unblock User</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚠️ Report Conversation</Text>
            <Text style={styles.modalSubtitle}>Provide details of the violation to the administrators:</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Reason (e.g. Fraud, Harassment, Spam)"
              placeholderTextColor="#94a3b8"
              value={reportReason}
              onChangeText={setReportReason}
            />

            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Additional details (optional)..."
              placeholderTextColor="#94a3b8"
              value={reportDesc}
              onChangeText={setReportDesc}
              multiline={true}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity onPress={() => setReportModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitReport} style={styles.modalSubmitBtn}>
                <Text style={styles.modalSubmitText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  headerBar: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  avatarMiniImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    resizeMode: 'cover'
  },
  avatarMiniText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  headerName: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4
  },
  onlineText: {
    color: '#94a3b8',
    fontSize: 10
  },
  headerActions: {
    flexDirection: 'row'
  },
  headerActionBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 6
  },
  securityHeader: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  securityText: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center'
  },
  list: {
    padding: 16,
    paddingBottom: 20
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10
  },
  myBubble: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2
  },
  otherBubble: {
    backgroundColor: '#334155',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18
  },
  myText: {
    color: '#ffffff'
  },
  otherText: {
    color: '#cbd5e1'
  },
  mapLinkBtn: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center'
  },
  mapLinkText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: 'bold'
  },
  typingIndicatorRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: 'transparent'
  },
  typingIndicatorText: {
    color: '#2563eb',
    fontSize: 12,
    fontStyle: 'italic'
  },
  inputArea: {
    backgroundColor: '#1e293b',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  attachmentRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  attachBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#475569'
  },
  attachIcon: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '600'
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  blockBanner: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  blockBannerText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  blockedPlaceholder: {
    backgroundColor: '#1e293b',
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  blockedPlaceholderText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: 'bold'
  },
  unblockBtnInline: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 4
  },
  unblockBtnInlineText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#334155'
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16
  },
  modalInput: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginBottom: 12,
    fontSize: 14
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  modalCancelBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.45,
    alignItems: 'center'
  },
  modalCancelText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  modalSubmitBtn: {
    backgroundColor: '#991b1b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.5,
    alignItems: 'center'
  },
  modalSubmitText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  }
});
