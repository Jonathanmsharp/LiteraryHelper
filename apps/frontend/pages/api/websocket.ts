import { Server as WebSocketServer } from 'ws';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../lib/verifyToken';
import type { Server } from 'http';

// Disable Next.js body parsing for WebSocket
export const config = {
  api: {
    bodyParser: false,
  },
};

// Event types for analysis progress
export type AnalysisEventType = 
  | 'analysis_started' 
  | 'analysis_progress' 
  | 'analysis_complete'
  | 'analysis_error';

// Message structure
export interface AnalysisMessage {
  type: AnalysisEventType;
  jobId: string;
  timestamp: string;
  payload: any;
}

// Connection tracking
interface ClientConnection {
  userId: string;
  ws: WebSocket;
  sessionId?: string;
}

// Global WebSocket server instance
let wss: WebSocketServer | null = null;
// Map of userId -> Set of client connections
const clients = new Map<string, Set<ClientConnection>>();
// Map of analysis jobs to interested clients
const jobSubscriptions = new Map<string, Set<string>>();

// Initialize WebSocket server (singleton)
function getWebSocketServer(server: Server): WebSocketServer {
  if (wss === null) {
    wss = new WebSocketServer({ noServer: true });
    console.log('[websocket] WebSocket server initialized');
  }
  return wss;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow WebSocket upgrades
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get server from request
  const server = (req.socket as any).server;
  if (!server) {
    return res.status(500).json({ error: 'Could not get server instance' });
  }

  // Initialize WebSocket server
  const wss = getWebSocketServer(server);

  // Handle upgrade
  server.on('upgrade', (request: any, socket: any, head: any) => {
    // Extract token from URL query parameters
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify token
    try {
      const payload = verifyToken(token);
      const userId = payload.userId;
      const sessionId = url.searchParams.get('sessionId') || undefined;

      // Upgrade the connection
      wss.handleUpgrade(request, socket, head, (ws) => {
        // Connection established
        console.log(`[websocket] Client connected: ${userId}`);
        
        // Store client connection
        if (!clients.has(userId)) {
          clients.set(userId, new Set());
        }
        
        const clientConnection: ClientConnection = {
          userId,
          ws: ws as unknown as WebSocket,
          sessionId
        };
        
        clients.get(userId)!.add(clientConnection);
        
        // Handle messages from client
        ws.on('message', (message: string) => {
          try {
            const data = JSON.parse(message);
            
            // Handle subscription to analysis job
            if (data.type === 'subscribe' && data.jobId) {
              if (!jobSubscriptions.has(data.jobId)) {
                jobSubscriptions.set(data.jobId, new Set());
              }
              jobSubscriptions.get(data.jobId)!.add(userId);
              console.log(`[websocket] User ${userId} subscribed to job ${data.jobId}`);
            }
            
            // Handle unsubscribe
            if (data.type === 'unsubscribe' && data.jobId) {
              const subs = jobSubscriptions.get(data.jobId);
              if (subs) {
                subs.delete(userId);
                if (subs.size === 0) {
                  jobSubscriptions.delete(data.jobId);
                }
                console.log(`[websocket] User ${userId} unsubscribed from job ${data.jobId}`);
              }
            }
          } catch (err) {
            console.error('[websocket] Error processing message:', err);
          }
        });
        
        // Handle disconnection
        ws.on('close', () => {
          console.log(`[websocket] Client disconnected: ${userId}`);
          
          // Remove client from connections
          const userConnections = clients.get(userId);
          if (userConnections) {
            userConnections.delete(clientConnection);
            if (userConnections.size === 0) {
              clients.delete(userId);
            }
          }
          
          // Clean up job subscriptions
          for (const [jobId, subscribers] of jobSubscriptions.entries()) {
            subscribers.delete(userId);
            if (subscribers.size === 0) {
              jobSubscriptions.delete(jobId);
            }
          }
        });
        
        // Send welcome message
        const welcomeMessage: AnalysisMessage = {
          type: 'analysis_started',
          jobId: 'system',
          timestamp: new Date().toISOString(),
          payload: { message: 'Connected to analysis WebSocket server' }
        };
        
        ws.send(JSON.stringify(welcomeMessage));
      });
    } catch (err) {
      console.error('[websocket] Authentication error:', err);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });
  
  // Return success for the initial HTTP request
  res.status(200).json({ status: 'WebSocket server running' });
}

// Utility function to send message to specific user
export function sendToUser(userId: string, message: AnalysisMessage): boolean {
  const userConnections = clients.get(userId);
  if (!userConnections || userConnections.size === 0) {
    return false;
  }
  
  const messageStr = JSON.stringify(message);
  let sent = false;
  
  for (const client of userConnections) {
    try {
      (client.ws as any).send(messageStr);
      sent = true;
    } catch (err) {
      console.error(`[websocket] Error sending to user ${userId}:`, err);
    }
  }
  
  return sent;
}

// Utility function to send message to all subscribers of a job
export function sendToJobSubscribers(jobId: string, message: AnalysisMessage): number {
  const subscribers = jobSubscriptions.get(jobId);
  if (!subscribers || subscribers.size === 0) {
    return 0;
  }
  
  let sentCount = 0;
  for (const userId of subscribers) {
    if (sendToUser(userId, message)) {
      sentCount++;
    }
  }
  
  return sentCount;
}

// Utility function to broadcast to all clients
export function broadcast(message: AnalysisMessage): number {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  for (const [userId, userConnections] of clients.entries()) {
    for (const client of userConnections) {
      try {
        (client.ws as any).send(messageStr);
        sentCount++;
      } catch (err) {
        console.error(`[websocket] Error broadcasting to user ${userId}:`, err);
      }
    }
  }
  
  return sentCount;
}

// Notify about analysis progress
export function notifyAnalysisProgress(
  jobId: string,
  progress: number,
  matches: any[],
  status: 'processing' | 'complete' | 'error' = 'processing'
): number {
  const eventType: AnalysisEventType = 
    status === 'complete' ? 'analysis_complete' :
    status === 'error' ? 'analysis_error' : 
    'analysis_progress';
    
  const message: AnalysisMessage = {
    type: eventType,
    jobId,
    timestamp: new Date().toISOString(),
    payload: {
      progress,
      matches,
      status
    }
  };
  
  return sendToJobSubscribers(jobId, message);
}
