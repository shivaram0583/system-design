import fs from "fs";
import path from "path";

const root = process.cwd();
const outDir = path.join(root, "assets", "visuals");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgShell({ title, width, height, content }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(title)}</title>
  <desc id="desc">High-fidelity system design visual for the client-server architecture section.</desc>
  <defs>
    <linearGradient id="page" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f7fbff" />
      <stop offset="100%" stop-color="#eef4ff" />
    </linearGradient>
    <linearGradient id="accentBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2f6fed" />
      <stop offset="100%" stop-color="#1944b9" />
    </linearGradient>
    <linearGradient id="accentTeal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#17b8a6" />
      <stop offset="100%" stop-color="#0e8e7e" />
    </linearGradient>
    <linearGradient id="accentGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffcd57" />
      <stop offset="100%" stop-color="#f59f0a" />
    </linearGradient>
    <linearGradient id="accentRose" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff7b8f" />
      <stop offset="100%" stop-color="#df5170" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#adc3e6" flood-opacity="0.38" />
    </filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
      <path d="M0,0 L12,6 L0,12 z" fill="#274690"/>
    </marker>
    <marker id="arrowSoft" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
      <path d="M0,0 L12,6 L0,12 z" fill="#5a78c8"/>
    </marker>
    <style>
      .bg { fill: url(#page); }
      .panel { fill: #ffffff; stroke: #d7e3fb; stroke-width: 1.4; filter: url(#shadow); }
      .soft { fill: #f8fbff; stroke: #d7e3fb; stroke-width: 1.2; }
      .title { font: 700 32px "Segoe UI", Arial, sans-serif; fill: #0f254e; }
      .subtitle { font: 500 15px "Segoe UI", Arial, sans-serif; fill: #496288; }
      .cardTitle { font: 700 20px "Segoe UI", Arial, sans-serif; fill: #102a56; }
      .cardBody { font: 500 15px "Segoe UI", Arial, sans-serif; fill: #35527f; }
      .small { font: 600 13px "Segoe UI", Arial, sans-serif; fill: #496288; text-transform: uppercase; letter-spacing: 1px; }
      .tiny { font: 600 12px "Segoe UI", Arial, sans-serif; fill: #6a7fa2; letter-spacing: 0.4px; }
      .labelDark { font: 700 16px "Segoe UI", Arial, sans-serif; fill: #143160; }
      .node { fill: #ffffff; stroke: #bed2f4; stroke-width: 1.4; }
      .nodeBlue { fill: #edf4ff; stroke: #95b8ff; stroke-width: 1.4; }
      .nodeTeal { fill: #ebfffb; stroke: #76d8cc; stroke-width: 1.4; }
      .nodeGold { fill: #fff8e7; stroke: #f4c55d; stroke-width: 1.4; }
      .nodeRose { fill: #fff1f4; stroke: #f0a1b4; stroke-width: 1.4; }
      .accentBlue { fill: url(#accentBlue); }
      .accentTeal { fill: url(#accentTeal); }
      .accentGold { fill: url(#accentGold); }
      .accentRose { fill: url(#accentRose); }
      .white { fill: #ffffff; font: 700 18px "Segoe UI", Arial, sans-serif; }
      .line { stroke: #274690; stroke-width: 4; fill: none; marker-end: url(#arrow); }
      .lineSoft { stroke: #5a78c8; stroke-width: 3; fill: none; marker-end: url(#arrowSoft); }
      .guide { stroke: #bfd0f1; stroke-width: 2; fill: none; }
      .guideSoft { stroke: #dce7fb; stroke-width: 1.6; fill: none; stroke-dasharray: 10 8; }
      .dashed { stroke-dasharray: 12 10; }
      .stepLabel { font: 700 14px "Segoe UI", Arial, sans-serif; fill: #35527f; }
    </style>
  </defs>
  <rect class="bg" width="${width}" height="${height}" rx="28" />
  <text x="48" y="58" class="title">${esc(title)}</text>
  <text x="48" y="86" class="subtitle">GitHub-safe SVG infographic for cleaner documentation rendering</text>
  ${content}
</svg>
`;
}

function roundedBox(x, y, w, h, cls, title, body = []) {
  const lines = Array.isArray(body) ? body : [body];
  const textLines = lines
    .map((line, index) => `<text x="${x + 20}" y="${y + 64 + index * 24}" class="cardBody">${esc(line)}</text>`)
    .join("\n");
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" class="${cls}" />
  <text x="${x + 20}" y="${y + 34}" class="small">${esc(title)}</text>
  ${textLines}`;
}

function pill(x, y, w, h, cls, text) {
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" class="${cls}" />
  <text x="${x + w / 2}" y="${y + h / 2 + 6}" text-anchor="middle" class="white">${esc(text)}</text>`;
}

function arrow(x1, y1, x2, y2, label = "", soft = false, dashed = false) {
  const cls = `${soft ? "lineSoft" : "line"}${dashed ? " dashed" : ""}`;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 10;
  return `
  <path d="M ${x1} ${y1} L ${x2} ${y2}" class="${cls.trim()}" />
  ${label ? `<text x="${midX}" y="${midY}" text-anchor="middle" class="stepLabel">${esc(label)}</text>` : ""}`;
}

function write(name, content) {
  fs.writeFileSync(path.join(outDir, name), content, "utf8");
}

ensureDir(outDir);

write(
  "client-server-overview.svg",
  svgShell({
    title: "Client-Server at a Glance",
    width: 1280,
    height: 760,
    content: `
  ${roundedBox(58, 160, 300, 230, "panel", "Client", [
    "Browser, mobile app, CLI, or script",
    "Initiates requests and renders results",
    "Handles UI, local state, and caching",
  ])}
  ${roundedBox(922, 160, 300, 230, "panel", "Server", [
    "Accepts requests over HTTP/gRPC/WebSocket",
    "Runs authentication, business logic, and data access",
    "Returns a response or streamed updates",
  ])}
  ${roundedBox(432, 144, 420, 120, "soft", "Network Contract", [
    "DNS -> TCP/TLS -> HTTP or another application protocol",
    "A request asks for work; a response carries data or status",
  ])}
  ${roundedBox(432, 320, 420, 180, "soft", "Why This Model Wins", [
    "Centralized data and policy enforcement",
    "Independent scaling for clients and servers",
    "One backend serving web, mobile, and partner APIs",
    "Security boundaries stay on the server side",
  ])}
  ${pill(146, 458, 128, 48, "accentBlue", "Request")}
  ${pill(1008, 458, 128, 48, "accentTeal", "Response")}
  ${arrow(360, 278, 430, 278, "Send")}
  ${arrow(850, 420, 790, 420, "Return", true)}
  ${roundedBox(432, 562, 420, 124, "nodeBlue", "Typical Examples", [
    "Web app page loads",
    "API requests from mobile apps",
    "Service-to-service calls in microservices",
  ])}
  `,
  }),
);

write(
  "client-server-vs-p2p.svg",
  svgShell({
    title: "Client-Server vs Peer-to-Peer",
    width: 1280,
    height: 780,
    content: `
  <rect x="58" y="140" width="546" height="560" rx="28" class="panel" />
  <rect x="676" y="140" width="546" height="560" rx="28" class="panel" />
  <text x="86" y="190" class="cardTitle">Client-Server</text>
  <text x="704" y="190" class="cardTitle">Peer-to-Peer</text>
  ${roundedBox(140, 248, 150, 90, "nodeBlue", "Client A", ["User-facing app"]) }
  ${roundedBox(140, 388, 150, 90, "nodeBlue", "Client B", ["Same backend"]) }
  ${roundedBox(370, 318, 150, 110, "nodeTeal", "Server", ["Shared logic", "Central data"]) }
  ${arrow(290, 292, 370, 350)}
  ${arrow(290, 432, 370, 390)}
  ${arrow(520, 374, 290, 374, "Responses", true)}
  ${roundedBox(760, 252, 150, 90, "nodeGold", "Peer A", ["Contributes storage"]) }
  ${roundedBox(964, 252, 150, 90, "nodeGold", "Peer B", ["Contributes bandwidth"]) }
  ${roundedBox(862, 430, 150, 90, "nodeGold", "Peer C", ["Contributes compute"]) }
  ${arrow(910, 298, 964, 298)}
  ${arrow(1010, 344, 930, 430)}
  ${arrow(862, 430, 824, 344)}
  ${roundedBox(92, 548, 478, 112, "soft", "Trade-off Snapshot", [
    "Client-server is simpler to secure and reason about.",
    "P2P removes the central bottleneck but raises coordination complexity.",
  ])}
  ${roundedBox(710, 548, 478, 112, "soft", "Trade-off Snapshot", [
    "P2P gains resilience and distributed capacity.",
    "Consistency, trust, and discovery become much harder problems.",
  ])}
  `,
  }),
);

write(
  "client-server-request-lifecycle.svg",
  svgShell({
    title: "End-to-End Request Lifecycle",
    width: 1480,
    height: 820,
    content: `
  ${roundedBox(70, 170, 1340, 560, "panel", "Journey", [])}
  ${pill(118, 276, 140, 52, "accentBlue", "1. DNS")}
  ${pill(308, 276, 170, 52, "accentGold", "2. TCP")}
  ${pill(536, 276, 170, 52, "accentTeal", "3. TLS")}
  ${pill(762, 276, 200, 52, "accentRose", "4. HTTP Request")}
  ${pill(1016, 276, 220, 52, "accentBlue", "5. Server Work")}
  ${pill(1260, 276, 140, 52, "accentTeal", "6. Response")}
  ${arrow(258, 302, 308, 302)}
  ${arrow(478, 302, 536, 302)}
  ${arrow(706, 302, 762, 302)}
  ${arrow(962, 302, 1016, 302)}
  ${arrow(1236, 302, 1260, 302)}
  ${roundedBox(104, 390, 164, 120, "nodeBlue", "Resolve", ["example.com", "to an IP address"]) }
  ${roundedBox(310, 390, 164, 120, "nodeGold", "Connect", ["SYN", "SYN-ACK", "ACK"]) }
  ${roundedBox(538, 390, 164, 120, "nodeTeal", "Secure", ["ClientHello", "ServerHello", "certificate"]) }
  ${roundedBox(782, 390, 160, 120, "nodeRose", "Ask", ["GET /api/users/42", "headers + auth"]) }
  ${roundedBox(1022, 390, 210, 120, "nodeBlue", "Process", ["Authenticate", "run business logic", "check cache / query DB"]) }
  ${roundedBox(1268, 390, 118, 120, "nodeTeal", "Return", ["200 OK", "JSON body"]) }
  ${roundedBox(110, 566, 1274, 100, "soft", "Key Insight", [
    "Most perceived latency comes from network setup, server work, and payload transfer — so caching, keep-alive, and efficient payloads matter.",
  ])}
  `,
  }),
);

write(
  "client-server-tier-models.svg",
  svgShell({
    title: "Tier Models from Local Apps to Production Systems",
    width: 1480,
    height: 980,
    content: `
  ${roundedBox(70, 150, 1320, 760, "panel", "Architecture Families", [])}
  ${roundedBox(110, 218, 260, 180, "nodeBlue", "1-Tier", ["UI, logic, and storage", "live on one machine", "Example: desktop app + SQLite"]) }
  ${roundedBox(430, 218, 260, 180, "nodeGold", "2-Tier", ["Client talks directly", "to an application or DB server", "Good for simple internal tools"]) }
  ${roundedBox(750, 218, 260, 180, "nodeTeal", "3-Tier", ["Presentation -> business logic -> data", "Most common web app pattern", "Scales each tier independently"]) }
  ${roundedBox(1070, 218, 260, 180, "nodeRose", "N-Tier", ["Adds CDN, load balancers, queues,", "caches, auth layers, and analytics", "Typical interview-ready production view"]) }

  ${roundedBox(136, 470, 210, 110, "soft", "Single Machine", ["UI | Logic | DB"]) }
  ${roundedBox(452, 470, 210, 110, "soft", "Client <-> Server", ["UI + some logic", "talks to remote backend"]) }
  ${roundedBox(772, 450, 220, 150, "soft", "Client <-> App <-> DB", ["Clear concern boundaries", "clean scaling story"]) }
  ${roundedBox(1092, 430, 220, 190, "soft", "Client -> CDN -> LB -> App -> Cache -> DB", ["Security, elasticity, and performance", "become first-class design goals"]) }

  ${arrow(346, 525, 430, 525)}
  ${arrow(662, 525, 750, 525)}
  ${arrow(992, 525, 1092, 525)}
  ${roundedBox(120, 690, 1240, 120, "soft", "How to Read the Progression", [
    "Every step adds a clearer separation of responsibilities and a better scaling story. The trade-off is more infrastructure, more coordination, and more operational complexity.",
  ])}
  `,
  }),
);

write(
  "client-server-scaling-evolution.svg",
  svgShell({
    title: "How a Server Tier Evolves Under Load",
    width: 1480,
    height: 920,
    content: `
  ${roundedBox(74, 152, 1328, 700, "panel", "From one box to many specialized layers", [])}
  ${roundedBox(106, 228, 250, 190, "nodeBlue", "Stage 1", ["Client -> single server", "Simple and cheap", "Fails once traffic spikes"]) }
  ${roundedBox(432, 228, 250, 190, "nodeGold", "Stage 2", ["Application server separated", "from the database", "Lets each part scale independently"]) }
  ${roundedBox(758, 228, 250, 190, "nodeTeal", "Stage 3", ["Load balancer + multiple", "stateless app servers", "Database remains central"]) }
  ${roundedBox(1084, 228, 250, 190, "nodeRose", "Stage 4", ["CDN, cache, queue, read replicas,", "and horizontally scaled services", "Full production posture"]) }

  ${roundedBox(118, 500, 226, 106, "soft", "Client -> Server + DB", [])}
  ${roundedBox(444, 500, 226, 106, "soft", "Client -> Server -> DB", [])}
  ${roundedBox(770, 480, 226, 146, "soft", "Clients -> LB -> Servers -> DB", ["LB fans out traffic"]) }
  ${roundedBox(1096, 460, 226, 186, "soft", "Client -> CDN -> LB -> Servers", ["Servers -> Cache", "Servers -> Primary DB", "Primary -> Read Replica"]) }

  ${arrow(356, 552, 432, 552)}
  ${arrow(682, 552, 758, 552)}
  ${arrow(1008, 552, 1084, 552)}
  ${roundedBox(120, 724, 1240, 90, "soft", "Rule of Thumb", [
    "Introduce the next layer only when the previous one becomes the bottleneck: optimize first, then separate concerns, then add horizontal scale and specialized infrastructure.",
  ])}
  `,
  }),
);

write(
  "client-server-pattern-selector.svg",
  svgShell({
    title: "Choosing the Right Communication Pattern",
    width: 1380,
    height: 860,
    content: `
  ${roundedBox(560, 152, 270, 88, "nodeBlue", "What kind of interaction do you need?", [])}
  ${roundedBox(120, 308, 220, 96, "nodeGold", "Standard CRUD", ["REST / request-response"]) }
  ${roundedBox(396, 308, 220, 96, "nodeTeal", "Periodic refresh", ["Polling or SSE"]) }
  ${roundedBox(670, 308, 220, 96, "nodeRose", "Realtime two-way", ["WebSocket"]) }
  ${roundedBox(944, 308, 220, 96, "nodeBlue", "Server-to-server event", ["Webhook"]) }
  ${roundedBox(580, 520, 230, 96, "nodeTeal", "Low-latency inter-service", ["gRPC"]) }

  ${arrow(694, 240, 230, 308, "CRUD")}
  ${arrow(694, 240, 506, 308, "Every few seconds")}
  ${arrow(694, 240, 780, 308, "Bidirectional")}
  ${arrow(694, 240, 1054, 308, "Async notify")}
  ${arrow(780, 404, 694, 520, "Internal service mesh", true)}
  ${roundedBox(184, 660, 1012, 106, "soft", "Design Hint", [
    "Start with the simplest pattern that satisfies the product need. Upgrade to SSE, WebSocket, or gRPC only when latency, directionality, or connection economics truly require it.",
  ])}
  `,
  }),
);

write(
  "client-server-ecommerce-flow.svg",
  svgShell({
    title: "E-Commerce Product Page: Architecture and Request Flow",
    width: 1500,
    height: 980,
    content: `
  ${roundedBox(74, 150, 1352, 338, "panel", "Top-Level Architecture", [])}
  ${roundedBox(118, 242, 176, 104, "nodeBlue", "Browser", ["React storefront"]) }
  ${roundedBox(350, 242, 176, 104, "nodeTeal", "CDN", ["Static JS/CSS/img"]) }
  ${roundedBox(582, 242, 176, 104, "nodeGold", "Load Balancer", ["Routes dynamic traffic"]) }
  ${roundedBox(814, 210, 196, 168, "nodeRose", "App Servers", ["Server 1", "Server 2", "Server 3"]) }
  ${roundedBox(1084, 226, 150, 124, "nodeTeal", "Redis", ["Product cache"]) }
  ${roundedBox(1262, 226, 120, 124, "nodeBlue", "Postgres", ["Products", "Reviews"]) }
  ${arrow(294, 294, 350, 294)}
  ${arrow(526, 294, 582, 294)}
  ${arrow(758, 294, 814, 294)}
  ${arrow(1010, 294, 1084, 294, "Cache")}
  ${arrow(1234, 294, 1262, 294, "Miss")}

  ${roundedBox(74, 540, 1352, 348, "panel", "Read Path", [])}
  ${roundedBox(120, 640, 144, 88, "nodeBlue", "1. Client", ["GET /product/12345"]) }
  ${roundedBox(304, 640, 144, 88, "nodeTeal", "2. CDN", ["Cache hit?", "Serve static assets"]) }
  ${roundedBox(488, 640, 144, 88, "nodeGold", "3. LB", ["Forward dynamic call"]) }
  ${roundedBox(672, 640, 144, 88, "nodeRose", "4. Server", ["Auth + assemble response"]) }
  ${roundedBox(856, 640, 144, 88, "nodeTeal", "5. Redis", ["Product cache"]) }
  ${roundedBox(1040, 640, 144, 88, "nodeBlue", "6. Postgres", ["Fallback source of truth"]) }
  ${roundedBox(1224, 640, 144, 88, "nodeGold", "7. Response", ["Return page data"]) }
  ${arrow(264, 684, 304, 684)}
  ${arrow(448, 684, 488, 684)}
  ${arrow(632, 684, 672, 684)}
  ${arrow(816, 684, 856, 684)}
  ${arrow(1000, 684, 1040, 684, "Miss")}
  ${arrow(1184, 684, 1224, 684)}
  ${roundedBox(146, 784, 1208, 74, "soft", "Performance Goal", [
    "Static assets come from the CDN, product data comes from cache when possible, and the database is the fallback — keeping the page under the 2-second target.",
  ])}
  `,
  }),
);

write(
  "client-server-generic-webapp.svg",
  svgShell({
    title: "Generic Web Application HLD",
    width: 1480,
    height: 920,
    content: `
  ${roundedBox(70, 154, 1340, 690, "panel", "Reference HLD", [])}
  ${roundedBox(104, 246, 250, 120, "nodeBlue", "Clients", ["Web", "iOS", "Android", "3rd-party API"]) }
  ${roundedBox(410, 246, 172, 120, "nodeTeal", "CDN", ["Static assets"]) }
  ${roundedBox(628, 246, 172, 120, "nodeGold", "DNS + WAF", ["Resolve + protect"]) }
  ${roundedBox(846, 246, 172, 120, "nodeRose", "Load Balancer", ["HTTPS entry point"]) }
  ${roundedBox(1064, 210, 286, 192, "soft", "App Tier", ["Server 1", "Server 2", "Server 3", "Stateless business logic"]) }
  ${roundedBox(932, 492, 180, 120, "nodeTeal", "Redis", ["Shared cache"]) }
  ${roundedBox(1140, 492, 180, 120, "nodeBlue", "Postgres", ["Primary data store"]) }
  ${roundedBox(1036, 656, 180, 120, "nodeGold", "Kafka", ["Async events"]) }
  ${arrow(354, 306, 410, 306)}
  ${arrow(582, 306, 628, 306)}
  ${arrow(800, 306, 846, 306)}
  ${arrow(1018, 306, 1064, 306)}
  ${arrow(1208, 402, 1022, 492, "Cache")}
  ${arrow(1232, 402, 1230, 492, "Data")}
  ${arrow(1208, 402, 1126, 656, "Events", true)}
  ${roundedBox(104, 670, 820, 120, "soft", "Operational Lens", [
    "Clients fetch static assets from the CDN and dynamic traffic through the balancer.",
    "App servers remain stateless so new instances can be added quickly under load.",
  ])}
  `,
  }),
);

write(
  "client-server-api-versioning.svg",
  svgShell({
    title: "API Versioning in a Live Client-Server System",
    width: 1440,
    height: 860,
    content: `
  ${roundedBox(72, 154, 1296, 640, "panel", "Version Compatibility", [])}
  ${roundedBox(110, 250, 220, 110, "nodeBlue", "Client v1", ["Legacy mobile release"]) }
  ${roundedBox(110, 406, 220, 110, "nodeGold", "Client v2", ["Current web app"]) }
  ${roundedBox(110, 562, 220, 110, "nodeRose", "Client v3", ["Newest partner SDK"]) }
  ${pill(420, 278, 310, 52, "accentBlue", "GET /api/v1/users")}
  ${pill(420, 434, 310, 52, "accentGold", "GET /api/v2/users")}
  ${pill(420, 590, 310, 52, "accentRose", "GET /api/v3/users")}
  ${roundedBox(840, 226, 420, 470, "soft", "Server Contract", [
    "One backend can keep multiple API contracts alive at the same time.",
    "The router maps each version to the right serialization and validation path.",
    "Older clients keep working while newer clients adopt better fields and behavior.",
  ])}
  ${roundedBox(890, 330, 320, 110, "nodeTeal", "Version Router", ["v1 controller", "v2 controller", "v3 controller"]) }
  ${roundedBox(890, 494, 320, 110, "nodeBlue", "Shared Core Services", ["auth", "business logic", "data access"]) }
  ${arrow(330, 306, 420, 306)}
  ${arrow(330, 462, 420, 462)}
  ${arrow(330, 618, 420, 618)}
  ${arrow(730, 306, 890, 384, "route")}
  ${arrow(730, 462, 890, 462, "route")}
  ${arrow(730, 618, 890, 540, "route")}
  ${arrow(1050, 440, 1050, 494, "reuse", true)}
  ${roundedBox(176, 718, 1088, 76, "soft", "Practical rule", [
    "Version the API contract at the edge, but keep the core business logic shared whenever possible.",
  ])}
  `,
  }),
);

write(
  "client-server-connection-pooling.svg",
  svgShell({
    title: "Connection Pooling Keeps Expensive Links Warm",
    width: 1440,
    height: 860,
    content: `
  ${roundedBox(72, 154, 1296, 640, "panel", "Connection Reuse", [])}
  ${roundedBox(118, 330, 220, 148, "nodeBlue", "Client", ["HTTP client or app server", "needs repeated calls"]) }
  ${roundedBox(468, 250, 260, 308, "soft", "Pool Manager", [
    "Creates a bounded set of reusable connections.",
    "Hands out an idle connection for each request.",
    "Avoids paying the TCP and TLS setup cost every time.",
  ])}
  ${roundedBox(516, 354, 164, 64, "nodeGold", "conn-01", ["busy"]) }
  ${roundedBox(516, 434, 164, 64, "nodeTeal", "conn-02", ["idle"]) }
  ${roundedBox(516, 514, 164, 64, "nodeRose", "conn-03", ["idle"]) }
  ${roundedBox(904, 330, 234, 148, "nodeBlue", "Server", ["database, HTTP API,", "or gRPC service"]) }
  ${arrow(338, 404, 468, 404, "checkout")}
  ${arrow(728, 386, 904, 386, "reuse")}
  ${arrow(728, 466, 904, 404, "reuse")}
  ${arrow(728, 546, 904, 422, "reuse")}
  ${arrow(904, 462, 728, 462, "return", true)}
  ${roundedBox(180, 654, 1080, 96, "soft", "Why this matters", [
    "Pooling reduces latency spikes, protects the upstream from connection storms, and gives you a clean place to cap concurrency.",
  ])}
  `,
  }),
);

write(
  "client-server-timeouts-retries.svg",
  svgShell({
    title: "Timeouts and Retries Need a Tight Budget",
    width: 1480,
    height: 860,
    content: `
  ${roundedBox(72, 154, 1336, 640, "panel", "Retry Timeline", [])}
  ${pill(134, 250, 172, 54, "accentBlue", "Initial request")}
  ${pill(382, 250, 184, 54, "accentRose", "250 ms timeout")}
  ${pill(642, 250, 178, 54, "accentGold", "100 ms backoff")}
  ${pill(892, 250, 152, 54, "accentTeal", "Retry once")}
  ${pill(1116, 250, 192, 54, "accentBlue", "Serve response")}
  ${arrow(306, 278, 382, 278)}
  ${arrow(566, 278, 642, 278)}
  ${arrow(820, 278, 892, 278)}
  ${arrow(1044, 278, 1116, 278)}
  ${roundedBox(134, 402, 246, 128, "nodeBlue", "Attempt 1", ["Client sends request", "server is slow or unreachable"]) }
  ${roundedBox(414, 402, 246, 128, "nodeRose", "Fail fast", ["timeout fires", "client stops waiting"]) }
  ${roundedBox(694, 402, 246, 128, "nodeGold", "Pause briefly", ["small backoff", "avoid instant retry storm"]) }
  ${roundedBox(974, 402, 246, 128, "nodeTeal", "Attempt 2", ["retry with same idempotent key", "success or final failure"]) }
  ${arrow(258, 530, 538, 530, "budget")}
  ${arrow(818, 530, 1098, 530, "bounded retry")}
  ${roundedBox(180, 622, 1120, 116, "soft", "Production guidance", [
    "Use short timeouts, a tiny retry count, backoff with jitter, and idempotency keys so retries do not multiply server-side side effects.",
  ])}
  `,
  }),
);

write(
  "client-server-request-handler-classes.svg",
  svgShell({
    title: "Request Handler Components",
    width: 1480,
    height: 980,
    content: `
  ${roundedBox(72, 154, 1336, 760, "panel", "LLD View", [])}
  ${roundedBox(114, 246, 314, 250, "nodeBlue", "HTTPServer", [
    "- port: int",
    "- router: Router",
    "- middlewareChain: Middleware[]",
    "+ start(), stop()",
    "+ handleRequest(req, res)",
  ])}
  ${roundedBox(584, 246, 274, 176, "nodeTeal", "Router", [
    "+ addRoute(method, path, handler)",
    "+ resolve(req): Handler",
  ])}
  ${roundedBox(1014, 246, 274, 176, "nodeGold", "Middleware", [
    "<<interface>>",
    "+ process(req, res, next)",
  ])}
  ${roundedBox(964, 544, 160, 108, "nodeRose", "AuthMW", ["validates auth"]) }
  ${roundedBox(1144, 544, 160, 108, "nodeBlue", "LoggerMW", ["records telemetry"]) }
  ${roundedBox(1054, 694, 160, 108, "nodeTeal", "RateLimitMW", ["protects upstream"]) }
  ${arrow(428, 334, 584, 334, "routes")}
  ${arrow(428, 396, 1014, 334, "uses")}
  <line x1="1150" y1="422" x2="1044" y2="544" class="guideSoft" />
  <line x1="1150" y1="422" x2="1224" y2="544" class="guideSoft" />
  <line x1="1150" y1="422" x2="1134" y2="694" class="guideSoft" />
  <text x="1136" y="454" class="tiny">implemented by</text>
  ${roundedBox(132, 626, 666, 154, "soft", "How the pieces cooperate", [
    "HTTPServer accepts the raw request, Router chooses the handler, and middleware wraps the call with cross-cutting behavior such as auth, logging, and rate limiting.",
  ])}
  `,
  }),
);

write(
  "client-server-get-request-sequence.svg",
  svgShell({
    title: "Handling a GET Request Through the Stack",
    width: 1560,
    height: 960,
    content: `
  ${roundedBox(74, 154, 1412, 760, "panel", "Request Sequence", [])}
  <text x="138" y="244" text-anchor="middle" class="small">Client</text>
  <text x="332" y="244" text-anchor="middle" class="small">Load Balancer</text>
  <text x="540" y="244" text-anchor="middle" class="small">Server</text>
  <text x="756" y="244" text-anchor="middle" class="small">Middleware</text>
  <text x="970" y="244" text-anchor="middle" class="small">Handler</text>
  <text x="1186" y="244" text-anchor="middle" class="small">Cache</text>
  <text x="1394" y="244" text-anchor="middle" class="small">Database</text>

  <line x1="138" y1="266" x2="138" y2="826" class="guideSoft" />
  <line x1="332" y1="266" x2="332" y2="826" class="guideSoft" />
  <line x1="540" y1="266" x2="540" y2="826" class="guideSoft" />
  <line x1="756" y1="266" x2="756" y2="826" class="guideSoft" />
  <line x1="970" y1="266" x2="970" y2="826" class="guideSoft" />
  <line x1="1186" y1="266" x2="1186" y2="826" class="guideSoft" />
  <line x1="1394" y1="266" x2="1394" y2="826" class="guideSoft" />

  ${arrow(138, 330, 332, 330, "GET /users/42")}
  ${arrow(332, 386, 540, 386, "forward")}
  ${arrow(540, 442, 756, 442, "auth")}
  ${arrow(756, 498, 540, 498, "next()", true)}
  ${arrow(540, 554, 756, 554, "log")}
  ${arrow(756, 610, 540, 610, "next()", true)}
  ${arrow(540, 666, 970, 666, "route match")}
  ${arrow(970, 722, 1186, 722, "cache lookup")}
  ${arrow(1186, 778, 970, 778, "miss", true)}
  ${arrow(970, 834, 1394, 834, "select user")}

  ${roundedBox(120, 848, 1320, 54, "soft", "Outcome", [
    "The handler misses cache, fetches from the database, populates cache, and returns the assembled response back through the stack.",
  ])}
  `,
  }),
);

console.log("Generated client-server SVG visuals in assets/visuals");
