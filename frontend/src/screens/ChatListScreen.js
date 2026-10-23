import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { AuthContext } from '../../App';

export default function ChatListScreen({ navigation }) {
    const { token, serverUrl, user } = useContext(AuthContext);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${serverUrl}/chat/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const mapped = data.map(c => {
              const isAgentUser = user.role?.toLowerCase() === 'agent';
              const otherParty = isAgentUser ? c.buyer?.user : c.agent?.user;
              return {
                id: c.id,
                agentId: isAgentUser ? c.buyerId : c.agentId,
                agentName: otherParty?.fullName || 'Client',
                lastMessage: c.messages && c.messages[0] ? c.messages[0].content : 'No messages yet.',
                lastMessageTime: c.lastMessageAt || c.createdAt,
                unread: c.messages ? c.messages.filter(m => !m.isRead && m.senderId !== user.id).length : 0,
                propertyTitle: c.property ? c.property.title : 'Property Discussion',
                otherPartyLastSeen: otherParty?.lastSeen || null,
                otherPartyProfileImage: otherParty?.profileImage || null,
                otherPartyUserId: otherParty?.id || null
              };
            });
            setConversations(mapped);
        } catch (error) {
            console.log('Error fetching conversations, using mock data...');
            setConversations([
                {
                    id: 1,
                    agentId: 'AGT2000002',
                    agentName: 'Jean Pierre',
                    lastMessage: 'Yes, it is registered under TF 4432/Fako. Completely clean.',
                    lastMessageTime: '2026-07-10T14:30:00Z',
                    unread: 2,
                    propertyTitle: 'Modern Student Studio in Molyko'
                },
                {
                    id: 2,
                    agentId: 'AGT2000002',
                    agentName: 'Jean Pierre',
                    lastMessage: 'The property is still available for viewing this weekend.',
                    lastMessageTime: '2026-07-08T09:15:00Z',
                    unread: 0,
                    propertyTitle: 'Luxury 2-Bedroom Apartment in Bastos'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    const getAvatarUri = (img) => {
        if (!img) return null;
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        return `${serverUrl.replace('/api', '')}${img}`;
    };

    const renderConversation = ({ item }) => (
        <TouchableOpacity
            style={styles.convRow}
            onPress={() => navigation.navigate('Chat', {
                conversationId: item.id,
                agentId: item.agentId,
                agentName: item.agentName,
                propertyTitle: item.propertyTitle,
                lastSeen: item.otherPartyLastSeen,
                profileImage: item.otherPartyProfileImage,
                otherPartyUserId: item.otherPartyUserId
            })}
        >
            <View style={styles.avatarCircle}>
                {item.otherPartyProfileImage ? (
                    <Image source={{ uri: getAvatarUri(item.otherPartyProfileImage) }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>{item.agentName.slice(0, 2).toUpperCase()}</Text>
                )}
            </View>
            <View style={styles.convInfo}>
                <View style={styles.convHeader}>
                    <Text style={styles.agentName}>{item.agentName}</Text>
                    <Text style={styles.timeText}>
                        {new Date(item.lastMessageTime).toLocaleDateString()}
                    </Text>
                </View>
                <Text style={styles.propertyRef} numberOfLines={1}>{item.propertyTitle}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            {item.unread > 0 && (
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const isAgent = user?.role?.toLowerCase() === 'agent';

    return (
        <View style={styles.container}>
            <View style={styles.headerBar}>
                <Text style={styles.headerTitle}>{isAgent ? '💬 Client Inquiries' : '💬 Messages'}</Text>
                <Text style={styles.headerSub}>
                    {isAgent ? 'Manage real-time chats and leads from prospective clients' : 'Real-time chat with verified agents'}
                </Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : conversations.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>💬</Text>
                    <Text style={styles.emptyText}>{isAgent ? 'No inquiries yet' : 'No conversations yet'}</Text>
                    <Text style={styles.emptySub}>
                        {isAgent 
                            ? 'Conversations will show up here as soon as a buyer/renter sends you a message.' 
                            : 'Chat with agents from property listings to start a conversation.'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderConversation}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a'
    },
    headerBar: {
        backgroundColor: '#1e293b',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#334155'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff'
    },
    headerSub: {
        color: '#94a3b8',
        fontSize: 11,
        marginTop: 2
    },
    list: {
        padding: 12
    },
    convRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        resizeMode: 'cover'
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    convInfo: {
        flex: 1
    },
    convHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2
    },
    agentName: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14
    },
    timeText: {
        color: '#94a3b8',
        fontSize: 11
    },
    propertyRef: {
        color: '#2563eb',
        fontSize: 11,
        marginBottom: 2
    },
    lastMessage: {
        color: '#94a3b8',
        fontSize: 12
    },
    unreadBadge: {
        backgroundColor: '#ef4444',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8
    },
    unreadText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold'
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16
    },
    emptyText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8
    },
    emptySub: {
        color: '#94a3b8',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18
    }
});