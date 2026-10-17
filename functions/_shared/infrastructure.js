const samples = new Map();
const names = new Set(['node_cpu_seconds_total','node_memory_MemTotal_bytes','node_memory_MemAvailable_bytes',
  'node_filesystem_size_bytes','node_filesystem_avail_bytes','pg_stat_database_numbackends','pg_stat_activity_count','pg_settings_max_connections']);

export function infrastructureSnapshot(text, project, now = Date.now()) {
  const rows = [];
  for (const line of text.split('\n')) {
    const match = line.trim().match(/^([A-Za-z_:][\w:]*)(?:\{(.*)\})?\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(?:\s+\d+)?$/);
    if (!match || !names.has(match[1])) continue;
    const value = Number(match[3]); if (!Number.isFinite(value) || value < 0) continue;
    const labels = {};
    let invalid = false;
    for (const label of (match[2] || '').matchAll(/([A-Za-z_]\w*)="((?:\\.|[^"\\])*)"/g)) {
      try { labels[label[1]] = JSON.parse('"' + label[2] + '"'); } catch { invalid = true; }
    }
    if (invalid || labels.service_type && labels.service_type !== 'db' || labels.supabase_project_ref && labels.supabase_project_ref !== project) continue;
    rows.push({ name: match[1], labels, value });
  }
  const select = name => rows.filter(row => row.name === name);
  const single = name => { const values = select(name); return values.length === 1 ? values[0].value : null; };
  const totalMemory = single('node_memory_MemTotal_bytes'), availableMemory = single('node_memory_MemAvailable_bytes');
  const memory = totalMemory > 0 && availableMemory !== null && availableMemory <= totalMemory
    ? { used: totalMemory - availableMemory, total: totalMemory, percent: (1 - availableMemory / totalMemory) * 100 } : null;
  const sizes = select('node_filesystem_size_bytes').filter(row => row.value > 0 && ['ext4','xfs','btrfs'].includes(row.labels.fstype));
  const root = sizes.find(row => row.labels.mountpoint === '/var/lib/postgresql') || sizes.find(row => row.labels.mountpoint === '/');
  const available = root && select('node_filesystem_avail_bytes').find(row => row.labels.device === root.labels.device && row.labels.mountpoint === root.labels.mountpoint);
  const disk = root && available && available.value <= root.value ? { used: root.value - available.value, total: root.value, mount: root.labels.mountpoint, percent: (1 - available.value / root.value) * 100 } : null;
  const backends = select('pg_stat_database_numbackends');
  const activities = select('pg_stat_activity_count');
  const connectionsUsed = backends.length ? backends.reduce((sum,row) => sum + row.value,0) : activities.length ? activities.reduce((sum,row) => sum + row.value,0) : null;
  const connections = connectionsUsed === null ? null : { used: connectionsUsed, total: single('pg_settings_max_connections') };
  const counters = new Map();
  for (const row of select('node_cpu_seconds_total')) {
    if (['guest','guest_nice'].includes(row.labels.mode)) continue;
    const key = JSON.stringify(Object.entries(row.labels).sort(([a],[b]) => a.localeCompare(b)));
    counters.set(key, { value: row.value, idle: row.labels.mode === 'idle' });
  }
  if (![...counters.values()].some(row => row.idle) || ![...counters.values()].some(row => !row.idle)) counters.clear();
  let cpu = null;
  const previous = samples.get(project);
  if (previous && now - previous.at >= 1000 && now - previous.at <= 900000 && previous.counters.size === counters.size && counters.size) {
    let total = 0, idle = 0, valid = true;
    for (const [key,row] of counters) {
      const before = previous.counters.get(key), delta = before ? row.value - before.value : -1;
      if (delta < 0) { valid = false; break; }
      total += delta; if (row.idle) idle += delta;
    }
    if (valid && total > 0 && idle <= total) cpu = { percent: (1 - idle / total) * 100, seconds: (now - previous.at) / 1000 };
  }
  if (samples.size >= 4 && !samples.has(project)) samples.delete(samples.keys().next().value);
  if (counters.size && (!previous || now > previous.at)) samples.set(project, { at: now, counters });
  return { memory, disk, connections, cpu, cpuWaiting: counters.size > 0 && !cpu,
    available: Boolean(memory || disk || connections || counters.size) };
}
