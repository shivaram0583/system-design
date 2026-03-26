import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const ROOT = process.cwd();
const TARGET_DIRS = [
  "01-fundamentals",
  "02-databases",
  "03-hld",
  "04-lld",
  "05-comparisons",
  "06-interview-prep",
];
const GENERATED_DIR = path.join(ROOT, "assets", "generated");

const BOX_CHARS = {
  "─": [["l", "m", "r", "m"]],
  "━": [["l", "m", "r", "m"]],
  "═": [["l", "m", "r", "m"]],
  "│": [["m", "t", "m", "b"]],
  "┃": [["m", "t", "m", "b"]],
  "║": [["m", "t", "m", "b"]],
  "┌": [["m", "b", "r", "m"]],
  "┐": [["l", "m", "m", "b"]],
  "└": [["m", "t", "r", "m"]],
  "┘": [["l", "m", "m", "t"]],
  "├": [["m", "t", "m", "b"], ["m", "m", "r", "m"]],
  "┤": [["m", "t", "m", "b"], ["l", "m", "m", "m"]],
  "┬": [["l", "m", "r", "m"], ["m", "m", "m", "b"]],
  "┴": [["l", "m", "r", "m"], ["m", "t", "m", "m"]],
  "┼": [["l", "m", "r", "m"], ["m", "t", "m", "b"]],
  "╭": [["m", "b", "r", "m"]],
  "╮": [["l", "m", "m", "b"]],
  "╰": [["m", "t", "r", "m"]],
  "╯": [["l", "m", "m", "t"]],
};

const SPECIAL_BLOCKS = {
  "01-fundamentals/35-batch-processing.md::Workflow Orchestration (Airflow)": `import java.time.LocalDate;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.JobBuilderFactory;
import org.springframework.batch.core.configuration.annotation.StepBuilderFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DailyEtlJobConfiguration {
    @Bean
    public Job dailyEtlJob(
            JobBuilderFactory jobs,
            Step extractStep,
            Step transformStep,
            Step loadStep) {
        return jobs.get("dailyEtlJob")
                .start(extractStep)
                .next(transformStep)
                .next(loadStep)
                .build();
    }

    @Bean
    public EtlRunContext etlRunContext() {
        return new EtlRunContext(LocalDate.now().minusDays(1));
    }

    public record EtlRunContext(LocalDate businessDate) {}
}`,
  "01-fundamentals/37-logging-metrics-tracing.md::Prometheus Metric Types": `import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.atomic.AtomicInteger;

public final class MetricsRegistry {
    private final Counter httpRequestsTotal;
    private final Counter paymentFailuresTotal;
    private final AtomicInteger activeConnections;
    private final Timer requestLatency;

    public MetricsRegistry(MeterRegistry registry) {
        this.httpRequestsTotal = Counter.builder("http_requests_total")
                .description("Total HTTP requests")
                .tag("service", "payment-service")
                .register(registry);

        this.paymentFailuresTotal = Counter.builder("payment_failures_total")
                .description("Failed payment attempts")
                .register(registry);

        this.activeConnections = registry.gauge("active_connections", new AtomicInteger(0));

        this.requestLatency = Timer.builder("http_request_latency")
                .description("End-to-end request latency")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry);
    }

    public void recordRequest(String endpoint, int statusCode, Runnable handler) {
        httpRequestsTotal.increment();
        requestLatency.record(handler);
        if (statusCode >= 500) {
            paymentFailuresTotal.increment();
        }
    }

    public void connectionOpened() {
        activeConnections.incrementAndGet();
    }

    public void connectionClosed() {
        activeConnections.decrementAndGet();
    }
}`,
  "02-databases/08-write-scaling.md::Write Batching": `import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;

public final class EventBatchWriter {
    private final Connection connection;

    public EventBatchWriter(Connection connection) {
        this.connection = connection;
    }

    public void insertIndividually(List<String> events) throws SQLException {
        try (PreparedStatement statement =
                     connection.prepareStatement("INSERT INTO events (data) VALUES (?)")) {
            for (String event : events) {
                statement.setString(1, event);
                statement.executeUpdate();
            }
        }
    }

    public void insertBatch(List<String> events) throws SQLException {
        try (PreparedStatement statement =
                     connection.prepareStatement("INSERT INTO events (data) VALUES (?)")) {
            for (String event : events) {
                statement.setString(1, event);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }
}`,
  "03-hld/16-api-rate-limiting-gateway.md::Distributed Counter with Redis": `import java.time.Duration;
import org.redisson.api.RRateLimiter;
import org.redisson.api.RateIntervalUnit;
import org.redisson.api.RateType;
import org.redisson.api.RedissonClient;

public final class DistributedRateLimiter {
    private final RedissonClient redissonClient;

    public DistributedRateLimiter(RedissonClient redissonClient) {
        this.redissonClient = redissonClient;
    }

    public RateLimitDecision check(String key, long limit, Duration window) {
        RRateLimiter limiter = redissonClient.getRateLimiter("rate:" + key);
        limiter.trySetRate(RateType.OVERALL, limit, window.getSeconds(), RateIntervalUnit.SECONDS);

        boolean allowed = limiter.tryAcquire(1);
        long remaining = allowed ? limiter.availablePermits() : 0L;
        long resetSeconds = window.getSeconds();

        return new RateLimitDecision(allowed, remaining, resetSeconds);
    }

    public record RateLimitDecision(boolean allowed, long remaining, long resetSeconds) {}
}`,
};

function walkMarkdownFiles() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) {
      continue;
    }
    for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }
      files.push(path.join(fullDir, entry.name));
    }
  }
  return files.sort();
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/\\/g, "-")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeXml(input) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isBoxArtBlock(language, content) {
  return language === "" && /[┌┐└┘├┤┬┴┼│─╭╮╰╯═║]/u.test(content);
}

function splitLinesPreserve(content) {
  return content.replace(/\r/g, "").split("\n");
}

function createSvg(content, title) {
  const lines = splitLinesPreserve(content);
  const fontSize = 14;
  const cellWidth = 8.4;
  const cellHeight = 20;
  const paddingX = 24;
  const paddingY = 24;
  const baseline = 15;
  const columns = Math.max(
    1,
    ...lines.map((line) => Array.from(line).length),
  );
  const width = Math.ceil(paddingX * 2 + columns * cellWidth);
  const height = Math.ceil(paddingY * 2 + lines.length * cellHeight);

  const segments = [];
  const textLines = [];

  lines.forEach((line, row) => {
    const chars = Array.from(line);
    const textBuffer = chars
      .map((char) => (BOX_CHARS[char] ? " " : char))
      .join("");
    if (textBuffer.trim().length > 0) {
      textLines.push(
        `<text x="${paddingX}" y="${paddingY + row * cellHeight + baseline}" xml:space="preserve">${escapeXml(textBuffer)}</text>`,
      );
    }

    chars.forEach((char, col) => {
      const mapping = BOX_CHARS[char];
      if (!mapping) {
        return;
      }
      const x = paddingX + col * cellWidth;
      const y = paddingY + row * cellHeight;
      for (const [x1, y1, x2, y2] of mapping) {
        segments.push(
          `<line x1="${coord(x, cellWidth, x1)}" y1="${coord(y, cellHeight, y1)}" x2="${coord(x, cellWidth, x2)}" y2="${coord(y, cellHeight, y2)}" />`,
        );
      }
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">Generated vector rendering of a documentation diagram.</desc>
  <defs>
    <style>
      .card { fill: #fbfcff; stroke: #cbd5e1; stroke-width: 1.2; }
      .segments { stroke: #0f172a; stroke-width: 1.8; stroke-linecap: round; }
      text {
        fill: #0f172a;
        font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-size: ${fontSize}px;
      }
    </style>
  </defs>
  <rect class="card" x="0.6" y="0.6" width="${width - 1.2}" height="${height - 1.2}" rx="16" />
  <g class="segments">
    ${segments.join("\n    ")}
  </g>
  <g>
    ${textLines.join("\n    ")}
  </g>
</svg>
`;
}

function coord(origin, span, point) {
  switch (point) {
    case "l":
      return origin;
    case "r":
      return origin + span;
    case "t":
      return origin;
    case "b":
      return origin + span;
    case "m":
      return origin + span / 2;
    default:
      return origin;
  }
}

function defaultValueForType(type) {
  const normalized = (type || "void").trim();
  if (normalized === "void") {
    return "";
  }
  if (normalized === "boolean") {
    return "return false;";
  }
  if (/^(byte|short|int|long|float|double)$/u.test(normalized)) {
    return "return 0;";
  }
  return "return null;";
}

function mapType(typeHint, parameterName) {
  const raw = (typeHint || "").trim();
  if (!raw) {
    if (/ttl|count|limit|size|seconds|retries|port|month|year|rank|lag/u.test(parameterName)) {
      return "int";
    }
    if (/enabled|allow|ready|healthy|active/u.test(parameterName)) {
      return "boolean";
    }
    if (/ids$|items$|messages$|events$|rows$|results$|nodes$|shards$|peers$|queries$/u.test(parameterName)) {
      return "List<Object>";
    }
    if (/client|connection|pool|driver|session|db|cache|redis|kafka|s3|kms|jwt|tracer|meter/u.test(parameterName)) {
      return "Object";
    }
    return "Object";
  }

  const normalized = raw.replace(/\s+/g, "");
  if (normalized.includes("|None") || normalized.includes("None|")) {
    return mapType(normalized.replace("|None", "").replace("None|", ""), parameterName);
  }
  if (normalized === "str") {
    return "String";
  }
  if (normalized === "int") {
    return "int";
  }
  if (normalized === "float") {
    return "double";
  }
  if (normalized === "bool") {
    return "boolean";
  }
  if (normalized === "dict" || normalized.startsWith("dict[")) {
    return "Map<String, Object>";
  }
  if (normalized === "list" || normalized.startsWith("list[")) {
    return "List<Object>";
  }
  if (normalized === "set" || normalized.startsWith("set[")) {
    return "Set<Object>";
  }
  if (normalized === "tuple" || normalized.startsWith("tuple[")) {
    return "List<Object>";
  }
  if (normalized === "datetime") {
    return "Instant";
  }
  if (normalized === "timedelta") {
    return "Duration";
  }
  if (normalized === "bytes") {
    return "byte[]";
  }
  return "Object";
}

function cleanParameter(rawParam) {
  const trimmed = rawParam.trim();
  if (!trimmed || trimmed === "self" || trimmed.startsWith("*")) {
    return null;
  }
  const match = trimmed.match(/^(\w+)(?::\s*([^=]+))?(?:\s*=\s*(.+))?$/);
  if (!match) {
    return { name: trimmed.replace(/=.*$/u, ""), type: "Object" };
  }
  const [, name, typeHint] = match;
  return { name, type: mapType(typeHint, name) };
}

function replaceIdentifiers(expression, replacements) {
  let output = expression;
  for (const [rawName, renderedName] of replacements.entries()) {
    const escaped = rawName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(`\\b${escaped}\\b`, "g"), renderedName);
  }
  return output;
}

function convertContainerLiteral(expression) {
  const trimmed = expression.trim();
  if (trimmed === "[]") {
    return "new ArrayList<>()";
  }
  if (trimmed === "{}") {
    return "new HashMap<>()";
  }
  if (trimmed === "set()") {
    return "new HashSet<>()";
  }
  const dictMatch = trimmed.match(/^\{(.+)\}$/u);
  if (!dictMatch) {
    return expression;
  }
  const pairs = dictMatch[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (pairs.length === 0 || pairs.some((pair) => !/^[A-Za-z0-9_'"-]+\s*:\s*[^,]+$/u.test(pair))) {
    return expression;
  }
  const renderedPairs = [];
  for (const pair of pairs) {
    const [key, value] = pair.split(/:\s*/u, 2);
    renderedPairs.push(`${key.replace(/^'/u, '"').replace(/'$/u, '"')}, ${value.replace(/^'/u, '"').replace(/'$/u, '"')}`);
  }
  return `Map.of(${renderedPairs.join(", ")})`;
}

function toCamelCase(name) {
  return name
    .replace(/^_+/u, "")
    .replace(/_([a-zA-Z0-9])/gu, (_, char) => char.toUpperCase())
    .replace(/^([A-Z])/u, (char) => char.toLowerCase());
}

function convertExpression(expression) {
  return expression
    .replace(/\bself\./g, "this.")
    .replace(/\bNone\b/g, "null")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\b/g, "!")
    .replace(/(\w+)\.append\(/g, "$1.add(")
    .replace(/(\w+)\.items\(\)/g, "$1.entrySet()")
    .replace(/(\w+)\.values\(\)/g, "$1.values()")
    .replace(/(\w+)\["([^"]+)"\]/g, '$1.get("$2")')
    .replace(/len\(([^)]+)\)/g, "$1.size()")
    .replace(/time\.time\(\)/g, "System.currentTimeMillis()")
    .replace(/uuid\.uuid4\(\)/g, "UUID.randomUUID()");
}

function normalizeCommentLine(line) {
  let text = line.trim();
  if (!text) {
    return null;
  }
  text = text
    .replace(/^#\s*/u, "")
    .replace(/^"""|"""$/gu, "")
    .replace(/^'''|'''$/gu, "")
    .replace(/\bself\./g, "")
    .replace(/\bNone\b/g, "null")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\s+$/u, "");
  if (!text || text === '"""' || text === "'''") {
    return null;
  }
  return `// ${text.replace(/:\s*$/u, "").trim()}`;
}

function renderMethodComments(bodyLines, returnType) {
  const comments = bodyLines
    .map(normalizeCommentLine)
    .filter(Boolean);

  const trimmedComments = comments.slice(0, 8);
  if (comments.length > 8) {
    trimmedComments.push("// ...");
  }

  const output = trimmedComments.map((line) => `        ${line}`);
  const fallback = defaultValueForType(returnType);
  if (fallback) {
    output.push(`        ${fallback}`);
  }
  if (output.length === 0) {
    output.push("        // Reference implementation omitted for brevity.");
    if (fallback) {
      output.push(`        ${fallback}`);
    }
  }
  return output.join("\n");
}

function renderConstructorBody(bodyLines, params) {
  const output = [];
  const paramMap = new Map(params.map((param) => [param.name, toCamelCase(param.name)]));
  for (const rawLine of bodyLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }
    const assignment = trimmed.match(/^self\.(\w+)\s*=\s*(.+)$/u);
    if (assignment) {
      const [, fieldName, expression] = assignment;
      const renderedExpression = replaceIdentifiers(convertExpression(expression), paramMap)
        .replace(/\bstr\(UUID\.randomUUID\(\)\)/g, "UUID.randomUUID().toString()")
        .replace(/\bf"([^"]*)\{([^}]+)\}([^"]*)"/g, (_, start, inner, end) => `"${start}" + ${toCamelCase(inner)} + "${end}"`)
        .replace(/\s+#.*$/u, "")
        .replace(/\s*\+\s*""$/u, "");
      output.push(`        this.${toCamelCase(fieldName)} = ${convertContainerLiteral(renderedExpression)};`);
      continue;
    }
    const comment = normalizeCommentLine(trimmed);
    if (comment) {
      output.push(`        ${comment}`);
    }
  }
  if (output.length === 0) {
    output.push("        // Initialize dependencies and defaults.");
  }
  return output.join("\n");
}

function parsePythonClasses(content) {
  const lines = splitLinesPreserve(content);
  const imports = [];
  const classes = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (/^(from|import)\b/u.test(trimmed)) {
      imports.push(trimmed);
      index += 1;
      continue;
    }

    const classMatch = line.match(/^class\s+(\w+)(?:\(([^)]*)\))?:\s*$/u);
    if (!classMatch) {
      index += 1;
      continue;
    }

    const [, name, baseList = ""] = classMatch;
    const classIndent = line.match(/^ */u)[0].length;
    const body = [];
    index += 1;
    while (index < lines.length) {
      const current = lines[index];
      const currentIndent = current.match(/^ */u)[0].length;
      if (current.trim().length > 0 && currentIndent <= classIndent) {
        break;
      }
      body.push(current);
      index += 1;
    }

    classes.push({ name, bases: baseList.split(",").map((base) => base.trim()).filter(Boolean), body });
  }

  return { imports, classes };
}

function parseMethods(classBody) {
  const methods = [];
  let index = 0;

  while (index < classBody.length) {
    const line = classBody[index];
    const startsMethod = /^(\s*)def\s+/u.test(line);
    if (!startsMethod) {
      index += 1;
      continue;
    }

    const signatureLines = [line.trim()];
    const indent = line.match(/^ */u)[0].length;
    while (!/:\s*$/u.test(signatureLines[signatureLines.length - 1]) && index + 1 < classBody.length) {
      index += 1;
      signatureLines.push(classBody[index].trim());
    }
    const signature = signatureLines.join(" ");
    const methodMatch = signature.match(/^def\s+(\w+)\((.+)\)(?:\s*->\s*([^:]+))?:\s*$/u);
    if (!methodMatch) {
      index += 1;
      continue;
    }

    const [, name, paramText, returnHint] = methodMatch;
    const body = [];
    index += 1;
    while (index < classBody.length) {
      const current = classBody[index];
      const currentIndent = current.match(/^ */u)[0].length;
      if (current.trim().length > 0 && currentIndent <= indent) {
        break;
      }
      body.push(current);
      index += 1;
    }

    methods.push({ name, params: paramText.split(",").map(cleanParameter).filter(Boolean), returnHint, body });
  }

  return methods;
}

function extractFields(classBody, methods) {
  const fieldMap = new Map();
  const constructor = methods.find((method) => method.name === "__init__");
  const constructorParams = new Map((constructor?.params || []).map((param) => [param.name, param.type]));
  for (const line of classBody) {
    const match = line.trim().match(/^self\.(\w+)\s*=\s*(.+)$/u);
    if (!match) {
      continue;
    }
    const [, fieldName, expression] = match;
    let type = "Object";
    if (constructorParams.has(expression.trim())) {
      type = constructorParams.get(expression.trim());
    } else if (/uuid\.uuid4/u.test(expression)) {
      type = "String";
    } else if (/time\.time|datetime|Instant/u.test(expression)) {
      type = "Instant";
    } else if (/f"|^["'].*["']$/u.test(expression)) {
      type = "String";
    } else if (/^\s*\{.+\}\s*$/u.test(expression)) {
      type = "Map<String, Object>";
    } else if (/^\s*\[\]\s*$/u.test(expression)) {
      type = "List<Object>";
    } else if (/ttl|seconds|delay|timeout|count|retries|limit|rank/u.test(fieldName)) {
      type = "int";
    } else if (/name|url|uri|secret|token|code|id/u.test(fieldName)) {
      type = "String";
    } else if (/cache|db|client|pool|session|driver|redis|kms|jwt|tracer|meter/u.test(fieldName)) {
      type = "Object";
    } else if (/enabled|allow|active|healthy/u.test(fieldName)) {
      type = "boolean";
    } else if (/items|messages|events|results|connections|subscribers|buffers/u.test(fieldName)) {
      type = "List<Object>";
    }
    fieldMap.set(fieldName, type);
  }
  return Array.from(fieldMap.entries()).map(([name, type]) => ({ name, type }));
}

function renderInterface(className, methods) {
  const lines = [`public interface ${className} {`];
  for (const method of methods) {
    const returnType = mapType(method.returnHint, method.name);
    const params = method.params
      .filter((param) => param.name !== "self")
      .map((param) => `${param.type} ${toCamelCase(param.name)}`)
      .join(", ");
    lines.push(`    ${returnType} ${toCamelCase(method.name)}(${params});`);
  }
  lines.push("}");
  return lines.join("\n");
}

function renderEnum(className, classBody) {
  const constants = [];
  for (const line of classBody) {
    const match = line.trim().match(/^([A-Z_]+)\s*=\s*["']?([^"']+)["']?$/u);
    if (match) {
      constants.push(match[1]);
    }
  }
  if (constants.length === 0) {
    constants.push("UNKNOWN");
  }
  return `public enum ${className} {\n    ${constants.join(",\n    ")}\n}`;
}

function translatePythonBlock(content) {
  const { imports, classes } = parsePythonClasses(content);
  if (classes.length === 0) {
    return `// Java-style equivalent\n// Original Python snippet converted into Java-oriented reference notes.\n// ${content.replace(/\r/g, "").split("\n").filter(Boolean).join("\n// ")}`;
  }

  const rendered = [];
  if (imports.length > 0) {
    rendered.push("// Dependencies in the original example:");
    for (const line of imports) {
      rendered.push(`// ${line}`);
    }
    rendered.push("");
  }

  classes.forEach((pythonClass, classIndex) => {
    const methods = parseMethods(pythonClass.body);
    if (pythonClass.bases.includes("ABC")) {
      rendered.push(renderInterface(pythonClass.name, methods));
      if (classIndex < classes.length - 1) {
        rendered.push("");
      }
      return;
    }

    if (pythonClass.bases.includes("Enum")) {
      rendered.push(renderEnum(pythonClass.name, pythonClass.body));
      if (classIndex < classes.length - 1) {
        rendered.push("");
      }
      return;
    }

    const fields = extractFields(pythonClass.body, methods);
    rendered.push(`public class ${pythonClass.name} {`);
    if (fields.length === 0) {
      rendered.push("    // State inferred from the original Python example.");
    } else {
      for (const field of fields) {
        rendered.push(`    private ${field.type} ${toCamelCase(field.name)};`);
      }
    }
    rendered.push("");

    for (const method of methods) {
      const params = method.params
        .filter((param) => param.name !== "self")
        .map((param) => `${param.type} ${toCamelCase(param.name)}`)
        .join(", ");

      if (method.name === "__init__") {
        rendered.push(`    public ${pythonClass.name}(${params}) {`);
        const body = renderConstructorBody(method.body, method.params.filter((param) => param.name !== "self"));
        rendered.push(body || "        // Initialize dependencies and defaults.");
        rendered.push("    }");
        rendered.push("");
        continue;
      }

      const returnType = mapType(method.returnHint, method.name);
      const methodName = toCamelCase(method.name.replace(/^__|__$/gu, ""));
      rendered.push(`    public ${returnType} ${methodName}(${params}) {`);
      rendered.push(renderMethodComments(method.body, returnType));
      rendered.push("    }");
      rendered.push("");
    }

    if (rendered[rendered.length - 1] === "") {
      rendered.pop();
    }
    rendered.push("}");
    if (classIndex < classes.length - 1) {
      rendered.push("");
    }
  });

  return rendered.join("\n");
}

function readSourceFile(relPath, fallbackPath) {
  const stagedSourcePath = path.join(ROOT, ".migration-source", relPath);
  if (fs.existsSync(stagedSourcePath)) {
    return fs.readFileSync(stagedSourcePath, "utf8");
  }
  try {
    return execFileSync("git", ["show", `HEAD:${relPath.replace(/\\/g, "/")}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return fs.readFileSync(fallbackPath, "utf8");
  }
}

function transformMarkdown(relPath, rawContent) {
  const eol = rawContent.includes("\r\n") ? "\r\n" : "\n";
  const lines = rawContent.replace(/\r/g, "").split("\n");
  const output = [];
  let currentHeading = path.basename(relPath, ".md");
  let inFence = false;
  let fenceLanguage = "";
  let fenceLines = [];
  let diagramIndex = 0;
  let touched = false;
  const assets = [];

  const flushFence = () => {
    const content = fenceLines.join("\n");
    const key = `${relPath.replace(/\\/g, "/")}::${currentHeading}`;
    if (SPECIAL_BLOCKS[key]) {
      output.push("```java");
      output.push(...SPECIAL_BLOCKS[key].split("\n"));
      output.push("```");
      touched = true;
      return;
    }

    if (fenceLanguage === "python") {
      output.push("```java");
      output.push(...translatePythonBlock(content).split("\n"));
      output.push("```");
      touched = true;
      return;
    }

    if (isBoxArtBlock(fenceLanguage, content)) {
      diagramIndex += 1;
      const fileSlug = slugify(relPath.replace(/\\/g, "/").replace(/\.md$/u, ""));
      const assetName = `${fileSlug}-diagram-${String(diagramIndex).padStart(2, "0")}.svg`;
      const assetPath = path.join(GENERATED_DIR, assetName);
      const title = `${currentHeading} diagram`;
      assets.push({ assetPath, content: createSvg(content, title) });
      output.push(`![${title}](../assets/generated/${assetName})`);
      touched = true;
      return;
    }

    output.push(`\`\`\`${fenceLanguage}`);
    output.push(...fenceLines);
    output.push("```");
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/u);
    if (!inFence && headingMatch) {
      currentHeading = headingMatch[2].trim();
    }

    const fenceMatch = line.match(/^```([A-Za-z0-9_+-]*)\s*$/u);
    if (!inFence && fenceMatch) {
      inFence = true;
      fenceLanguage = fenceMatch[1] || "";
      fenceLines = [];
      continue;
    }
    if (inFence && /^```\s*$/u.test(line)) {
      flushFence();
      inFence = false;
      fenceLanguage = "";
      fenceLines = [];
      continue;
    }

    if (inFence) {
      fenceLines.push(line);
    } else {
      output.push(line);
    }
  }

  return {
    content: output.join(eol),
    touched,
    assets,
  };
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function main() {
  ensureDir(GENERATED_DIR);

  let updatedFiles = 0;
  let generatedAssets = 0;

  for (const filePath of walkMarkdownFiles()) {
    const relPath = path.relative(ROOT, filePath);
    const original = readSourceFile(relPath, filePath);
    const transformed = transformMarkdown(relPath, original);
    if (!transformed.touched) {
      continue;
    }
    fs.writeFileSync(filePath, transformed.content, "utf8");
    for (const asset of transformed.assets) {
      fs.writeFileSync(asset.assetPath, asset.content, "utf8");
      generatedAssets += 1;
    }
    updatedFiles += 1;
  }

  console.log(`Updated markdown files: ${updatedFiles}`);
  console.log(`Generated SVG assets: ${generatedAssets}`);
}

main();
