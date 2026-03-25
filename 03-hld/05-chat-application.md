# HLD 05: Chat Application (WhatsApp / Messenger)

> **Difficulty**: Medium
> **Key Concepts**: WebSocket, presence, message ordering, group chat, end-to-end encryption

---

## 1. Requirements

### Functional Requirements

- 1:1 messaging (text, images, files)
- Group chats (up to 500 members)
- Online/offline presence indicators
- Read receipts (sent, delivered, read)
- Message history and search
- Push notifications for offline users

### Non-Functional Requirements

- **Low latency**: Message delivery < 200ms (same region)
- **Reliability**: No lost messages (at-least-once delivery)
- **Ordering**: Messages appear in order per conversation
- **Scale**: 500M daily active users, 50B messages/day
- **Availability**: 99.99% uptime

---

## 2. Capacity Estimation

```
Messages: 50B/day ≈ 580K messages/sec
Active connections: 500M concurrent WebSocket connections

Storage:
  Avg message: 200 bytes
  50B/day × 200B = 10 TB/day, 3.6 PB/year (with media: much more)

  Media: assume 10% messages have images (~500 KB avg)
  5B × 500 KB = 2.5 PB/day media storage

WebSocket servers:
  Each server handles ~50K connections
  500M / 50K = 10,000 WebSocket servers
```

---

## 3. API Design

```
WebSocket: wss://chat.app/ws?token=JWT

Client → Server messages:
  { "type": "send_message", "chat_id": "c1", "content": "Hello!", "client_msg_id": "uuid" }
  { "type": "typing", "chat_id": "c1" }
  { "type": "read_receipt", "chat_id": "c1", "msg_id": "m123" }

Server → Client messages:
  { "type": "new_message", "chat_id": "c1", "msg_id": "m123", "sender": "u1", "content": "Hello!" }
  { "type": "delivered", "msg_id": "m123" }
  { "type": "presence", "user_id": "u2", "status": "online" }

REST (for history, search):
  GET /api/v1/chats/{chat_id}/messages?before=cursor&limit=50
  GET /api/v1/chats?user_id=u1
```

---

## 4. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────┐  WebSocket   ┌──────────────────┐              │
│  │  Client  │◄────────────►│  WS Gateway      │              │
│  │  (App)   │              │  (10K servers)    │              │
│  └──────────┘              │  Connection Mgr   │              │
│                             └────────┬─────────┘              │
│                                      │                         │
│                             ┌────────┴─────────┐              │
│                             │  Chat Service    │              │
│                             │  (message routing│              │
│                             │   + ordering)    │              │
│                             └────────┬─────────┘              │
│                                      │                         │
│              ┌───────────────────────┼────────────────┐       │
│              │                       │                │       │
│       ┌──────┴──────┐        ┌──────┴──────┐  ┌─────┴─────┐│
│       │  Kafka      │        │ Cassandra   │  │ Redis     ││
│       │  (message   │        │ (messages,  │  │ (presence,││
│       │   fanout)   │        │  chat meta) │  │  sessions,││
│       └─────────────┘        └─────────────┘  │  routing) ││
│                                                └───────────┘│
│       ┌─────────────┐        ┌─────────────┐               │
│       │ Push Notif  │        │ S3 / CDN    │               │
│       │ Service     │        │ (media)     │               │
│       └─────────────┘        └─────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Key Design Decisions

### Message Flow (1:1)

```
Alice sends "Hello" to Bob:

1. Alice's app → WebSocket → WS Gateway Server #42
2. Gateway forwards to Chat Service
3. Chat Service:
   a. Generate message_id (Snowflake)
   b. Store in Cassandra (chat_id partition)
   c. Publish to Kafka topic: messages.{bob_user_id}
4. Kafka consumer checks: Is Bob online?
   a. YES: Find Bob's WS Gateway (Redis lookup) → push via WebSocket
   b. NO: Queue push notification → FCM/APNS
5. Bob's device receives message → sends "delivered" ack
6. Chat Service updates delivery status → notifies Alice
```

### Session/Connection Registry

```
Redis stores which WS Gateway server each user is connected to:

  SET user:bob:ws_server "gateway-42"   (with TTL)
  
  To send message to Bob:
    1. GET user:bob:ws_server → "gateway-42"
    2. Send to gateway-42 internal API → pushes to Bob's WebSocket
    3. If key doesn't exist → Bob is offline → push notification

  Multi-device: user may be on phone + laptop
    SET user:bob:devices {"phone": "gw-42", "laptop": "gw-17"}
    Deliver to ALL active devices
```

### Group Chat Fan-out

```
Group with 200 members, Alice sends a message:

Option A: Write-time fan-out (WhatsApp approach)
  Store message once in group chat.
  For each member: check if online → deliver or queue notification.
  Kafka consumer fans out to each member's delivery queue.
  
Option B: Read-time fan-out
  Store message in group timeline.
  When member opens chat → read latest messages.
  Simpler but higher read latency.

Recommended: Write-time fan-out for small groups (<500)
  For each member: O(group_size) delivery operations per message
  200 members × 580K msg/sec = manageable with Kafka
```

### Message Ordering

```
Problem: Network delays may deliver messages out of order.

Solution: Server-assigned monotonic sequence number per chat.
  Each chat has a counter in Redis: INCR chat:{chat_id}:seq
  Messages ordered by sequence number, not timestamp.

  Client: Buffer messages, display sorted by sequence number.
  If gap detected (got seq 5, 7 — missing 6): request retransmit.
```

---

## 6. Scaling & Bottlenecks

```
WebSocket connections:
  10K gateway servers, each handles 50K connections
  Stateless design: any gateway can handle any user
  Load balancer: sticky sessions (user stays on same gateway during session)

Message storage:
  Cassandra: partition by chat_id, cluster by timestamp
  100B+ messages → multi-TB, handled by Cassandra's linear scaling

Presence:
  Redis pub/sub: presence updates to friends
  Optimization: Only push presence to users who have the chat open
  Heartbeat: client pings every 30s → server updates presence

Media:
  Upload to S3 via pre-signed URL → store S3 key in message
  CDN for media delivery (thumbnails, previews)
```

---

## 7. Trade-offs

| Decision | Trade-off |
|----------|-----------|
| WebSocket vs long polling | Real-time vs simpler infrastructure |
| Write fan-out vs read fan-out | Write cost vs read latency |
| Cassandra vs PostgreSQL | Scale vs query flexibility |
| E2E encryption | Security vs server-side search capability |

---

## 8. Summary

- **Core**: WebSocket for real-time, Kafka for message routing, Cassandra for storage
- **Connection registry**: Redis maps user → gateway server for message delivery
- **Ordering**: Server-assigned sequence numbers per chat
- **Groups**: Write-time fan-out for small groups
- **Offline**: Push notifications via FCM/APNS
- **Media**: S3 + CDN, pre-signed URLs for upload

> **Next**: [06 — Uber / Ride-Hailing](06-uber-ride-hailing.md)
