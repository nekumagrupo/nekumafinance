const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {infrastructureSnapshot:read}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('functions/_shared/infrastructure.js','utf8')).toString('base64'));
 const base='node_memory_MemTotal_bytes 1000\nnode_memory_MemAvailable_bytes 480\nnode_filesystem_size_bytes{device="vda",mountpoint="/",fstype="ext4"} 2000\nnode_filesystem_avail_bytes{device="vda",mountpoint="/",fstype="ext4"} 1720\npg_stat_database_numbackends{datname="postgres"} 8\npg_settings_max_connections 60\n';
 const first=read(base+'node_cpu_seconds_total{cpu="0",mode="idle"} 900\nnode_cpu_seconds_total{cpu="0",mode="user"} 100','project',10000);
 assert.equal(first.memory.percent,52);assert.ok(Math.abs(first.disk.percent-14)<1e-8);assert.equal(first.connections.used,8);assert.equal(first.connections.total,60);assert.equal(first.cpu,null);assert.equal(first.cpuWaiting,true);
 const second=read(base+'node_cpu_seconds_total{cpu="0",mode="idle"} 990\nnode_cpu_seconds_total{cpu="0",mode="user"} 110','project',110000);
 assert.ok(Math.abs(second.cpu.percent-10)<1e-8);assert.equal(second.cpu.seconds,100);
 const reset=read(base+'node_cpu_seconds_total{cpu="0",mode="idle"} 1\nnode_cpu_seconds_total{cpu="0",mode="user"} 2','project',210000);assert.equal(reset.cpu,null,'Counter reset cannot fabricate CPU rate');
 const missing=read('node_memory_MemTotal_bytes NaN\nnode_memory_MemAvailable_bytes -2','empty');assert.equal(missing.available,false);
 assert.equal(read('node_memory_MemTotal_bytes{supabase_project_ref="other"} 1000','project').memory,null);
 assert.equal(read('node_cpu_seconds_total{mode="idle"} 100','only-idle').cpuWaiting,false);
 console.log('PASS: infrastructure gauges, disk mount, connections, two-sample CPU, counter resets, absent/invalid series and project filtering. Fixture tests, not live metrics.');
})().catch(error=>{console.error(error);process.exitCode=1});
